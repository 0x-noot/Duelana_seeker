import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { assert } from 'chai';

// IDL will be auto-loaded by Anchor test framework
const DUEL_SEED = Buffer.from('duel');
const ESCROW_SEED = Buffer.from('escrow');

describe('duelana', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Duelana as Program;

  const creator = Keypair.generate();
  const challenger = Keypair.generate();
  const resolver = Keypair.generate();

  const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);

  let duelPDA: PublicKey;
  let duelBump: number;
  let escrowPDA: PublicKey;
  let escrowBump: number;
  let createdAt: anchor.BN;

  before(async () => {
    // Airdrop SOL to test accounts
    const airdropCreator = await provider.connection.requestAirdrop(
      creator.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropChallenger = await provider.connection.requestAirdrop(
      challenger.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(airdropChallenger);

    createdAt = new anchor.BN(Math.floor(Date.now() / 1000));

    const createdAtBuf = Buffer.alloc(8);
    createdAtBuf.writeBigInt64LE(BigInt(createdAt.toString()));

    [duelPDA, duelBump] = PublicKey.findProgramAddressSync(
      [DUEL_SEED, creator.publicKey.toBuffer(), createdAtBuf],
      program.programId,
    );

    [escrowPDA, escrowBump] = PublicKey.findProgramAddressSync(
      [ESCROW_SEED, duelPDA.toBuffer()],
      program.programId,
    );
  });

  it('creates a duel', async () => {
    await program.methods
      .createDuel(betAmount, createdAt)
      .accounts({
        creator: creator.publicKey,
        duel: duelPDA,
        escrow: escrowPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const duel = await program.account.duel.fetch(duelPDA);
    assert.ok(duel.creator.equals(creator.publicKey));
    assert.ok(duel.betAmount.eq(betAmount));
    assert.deepEqual(duel.status, { waiting: {} });
    assert.ok(duel.challenger.equals(PublicKey.default));

    const escrowBalance = await provider.connection.getBalance(escrowPDA);
    assert.ok(escrowBalance >= betAmount.toNumber());
  });

  it('prevents creator from joining own duel', async () => {
    try {
      await program.methods
        .joinDuel()
        .accounts({
          challenger: creator.publicKey,
          duel: duelPDA,
          escrow: escrowPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
      assert.fail('Should have thrown');
    } catch (err: any) {
      assert.include(err.toString(), 'CreatorCannotJoin');
    }
  });

  it('allows challenger to join duel', async () => {
    await program.methods
      .joinDuel()
      .accounts({
        challenger: challenger.publicKey,
        duel: duelPDA,
        escrow: escrowPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([challenger])
      .rpc();

    const duel = await program.account.duel.fetch(duelPDA);
    assert.ok(duel.challenger.equals(challenger.publicKey));
    assert.deepEqual(duel.status, { active: {} });

    const escrowBalance = await provider.connection.getBalance(escrowPDA);
    assert.ok(escrowBalance >= betAmount.toNumber() * 2);
  });

  it('prevents joining an already active duel', async () => {
    const otherPlayer = Keypair.generate();
    const airdrop = await provider.connection.requestAirdrop(
      otherPlayer.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(airdrop);

    try {
      await program.methods
        .joinDuel()
        .accounts({
          challenger: otherPlayer.publicKey,
          duel: duelPDA,
          escrow: escrowPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([otherPlayer])
        .rpc();
      assert.fail('Should have thrown');
    } catch (err: any) {
      assert.include(err.toString(), 'InvalidDuelState');
    }
  });

  it('resolves a duel (creator wins when result[0] < 128)', async () => {
    // Simulate VRF result where first byte < 128 (creator wins)
    const vrfResult = new Uint8Array(32);
    vrfResult[0] = 50; // < 128 = creator wins

    await program.methods
      .resolveDuel(Array.from(vrfResult))
      .accounts({
        resolver: resolver.publicKey,
        duel: duelPDA,
      })
      .signers([resolver])
      .rpc();

    const duel = await program.account.duel.fetch(duelPDA);
    assert.ok(duel.winner.equals(creator.publicKey));
    assert.deepEqual(duel.status, { resolved: {} });
    assert.isNotNull(duel.vrfResult);
  });

  it('prevents non-winner from claiming', async () => {
    const treasury = new PublicKey('6uT7LVyYWZS37pC2cv4FtMeMT9ScnivjukxfxFgbgEPY');

    try {
      await program.methods
        .claimWinnings()
        .accounts({
          winner: challenger.publicKey,
          duel: duelPDA,
          escrow: escrowPDA,
          treasury,
          systemProgram: SystemProgram.programId,
        })
        .signers([challenger])
        .rpc();
      assert.fail('Should have thrown');
    } catch (err: any) {
      assert.include(err.toString(), 'NotWinner');
    }
  });

  it('allows winner to claim winnings', async () => {
    const treasury = new PublicKey('6uT7LVyYWZS37pC2cv4FtMeMT9ScnivjukxfxFgbgEPY');

    const winnerBalanceBefore = await provider.connection.getBalance(
      creator.publicKey,
    );

    await program.methods
      .claimWinnings()
      .accounts({
        winner: creator.publicKey,
        duel: duelPDA,
        escrow: escrowPDA,
        treasury,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const duel = await program.account.duel.fetch(duelPDA);
    assert.deepEqual(duel.status, { claimed: {} });

    const winnerBalanceAfter = await provider.connection.getBalance(
      creator.publicKey,
    );
    // Winner should have received approximately pot - 3% fee (minus tx fees)
    const expectedPayout = betAmount.toNumber() * 2 * 0.97;
    const gained = winnerBalanceAfter - winnerBalanceBefore;
    // Allow for tx fees
    assert.ok(gained > expectedPayout * 0.95);
  });

  // --- Cancel duel test (separate duel) ---
  it('allows creator to cancel a waiting duel', async () => {
    const cancelCreatedAt = new anchor.BN(Math.floor(Date.now() / 1000) + 1);
    const createdAtBuf = Buffer.alloc(8);
    createdAtBuf.writeBigInt64LE(BigInt(cancelCreatedAt.toString()));

    const [cancelDuelPDA] = PublicKey.findProgramAddressSync(
      [DUEL_SEED, creator.publicKey.toBuffer(), createdAtBuf],
      program.programId,
    );
    const [cancelEscrowPDA] = PublicKey.findProgramAddressSync(
      [ESCROW_SEED, cancelDuelPDA.toBuffer()],
      program.programId,
    );

    const cancelBet = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

    await program.methods
      .createDuel(cancelBet, cancelCreatedAt)
      .accounts({
        creator: creator.publicKey,
        duel: cancelDuelPDA,
        escrow: cancelEscrowPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const balanceBefore = await provider.connection.getBalance(
      creator.publicKey,
    );

    await program.methods
      .cancelDuel()
      .accounts({
        creator: creator.publicKey,
        duel: cancelDuelPDA,
        escrow: cancelEscrowPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const balanceAfter = await provider.connection.getBalance(
      creator.publicKey,
    );
    // Creator should have gotten back the bet (minus tx fees + rent recovered)
    assert.ok(balanceAfter > balanceBefore);
  });
});
