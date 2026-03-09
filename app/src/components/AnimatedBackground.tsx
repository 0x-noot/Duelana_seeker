import React, { useState, useRef, useEffect } from 'react';
import { View, ImageBackground, ImageSourcePropType, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface Props {
  frames: ImageSourcePropType[];
  frameDuration?: number;
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  children?: React.ReactNode;
}

export default function AnimatedBackground({
  frames,
  frameDuration = 200,
  style,
  resizeMode = 'cover',
  children,
}: Props) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (frames.length <= 1) return;
    frameRef.current = 0;
    setCurrentFrame(0);
    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % frames.length;
      setCurrentFrame(frameRef.current);
    }, frameDuration);
    return () => clearInterval(interval);
  }, [frames.length, frameDuration]);

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {frames.map((frame, i) => (
        <ImageBackground
          key={i}
          source={frame}
          style={[StyleSheet.absoluteFillObject, { opacity: i === currentFrame ? 1 : 0 }]}
          resizeMode={resizeMode}
        />
      ))}
      <View style={StyleSheet.absoluteFillObject}>
        {children}
      </View>
    </View>
  );
}
