import React, { useState, useEffect, useRef } from 'react';
import { View, Image, ImageSourcePropType, ViewStyle, ImageStyle } from 'react-native';

interface SpriteAnimatorProps {
  frames: ImageSourcePropType[];
  frameDuration: number;
  playing: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export function SpriteAnimator({
  frames,
  frameDuration,
  playing,
  style,
  imageStyle,
}: SpriteAnimatorProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!playing || frames.length <= 1) return;

    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % frames.length;
      setCurrentFrame(frameRef.current);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [playing, frames.length, frameDuration]);

  // Reset frame when frames array changes (animation type switch)
  useEffect(() => {
    frameRef.current = 0;
    setCurrentFrame(0);
  }, [frames]);

  // Clamp to valid index in case frames array changed before reset effect ran
  const safeIndex = currentFrame < frames.length ? currentFrame : 0;

  return (
    <View style={style}>
      <Image
        source={frames[safeIndex]}
        style={imageStyle}
        resizeMode="contain"
      />
    </View>
  );
}
