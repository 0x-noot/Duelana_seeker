const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-get-random-values'),
};

// Add audio file extensions so Metro can bundle .ogg, .wav, .mp3
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'ogg'];

module.exports = config;
