import React, { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated, Modal, PanResponder, StyleSheet,
  TouchableWithoutFeedback, View,
} from 'react-native';
import { colors } from '../theme';

/**
 * Bottom sheet that closes when dragged down by its handle (or by tapping
 * the dimmed backdrop). Wraps every pop-up in the app so "swipe down to
 * dismiss" behaves the same everywhere.
 */
export function SwipeableSheet({ visible, onClose, children, fullScreen = false }: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  fullScreen?: boolean;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const dismiss = () => {
    Animated.timing(translateY, { toValue: 700, duration: 180, useNativeDriver: true }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 110 || g.vy > 0.6) dismiss();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        {!fullScreen && (
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
        )}
        <Animated.View
          style={[
            fullScreen ? styles.sheetFull : styles.sheet,
            { transform: [{ translateY }] },
          ]}
        >
          {/* Drag zone: the handle strip at the top of every sheet */}
          <View {...pan.panHandlers} style={styles.dragZone}>
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.55)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '90%',
  },
  sheetFull: {
    flex: 1, marginTop: 40,
    backgroundColor: colors.background,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  dragZone: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border },
});
