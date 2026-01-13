import React from 'react';
import {
  View,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { colors, spacing, borderRadius, shadows } from '../constants/theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  maxWidth?: number;
  fullScreen?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdrop = true,
  maxWidth = 500,
  fullScreen = false,
}: ModalProps) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Calculate responsive dimensions
  const isSmallScreen = screenWidth < 400;
  const isMediumScreen = screenWidth >= 400 && screenWidth < 768;
  const isLargeScreen = screenWidth >= 768;

  // Modal width calculation
  const modalWidth = fullScreen
    ? screenWidth
    : isSmallScreen
    ? screenWidth - spacing.md * 2
    : isMediumScreen
    ? Math.min(screenWidth - spacing.lg * 2, maxWidth)
    : Math.min(screenWidth * 0.8, maxWidth);

  // Modal max height - leave room for safe areas
  const modalMaxHeight = fullScreen
    ? screenHeight
    : screenHeight * 0.85;

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[
                styles.modalContainer,
                fullScreen && styles.fullScreenContainer,
              ]}
            >
              <View
                style={[
                  styles.modal,
                  fullScreen && styles.fullScreenModal,
                  {
                    width: modalWidth,
                    maxHeight: modalMaxHeight,
                  },
                ]}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <View style={styles.header}>
                    {title ? (
                      <Text style={styles.title} numberOfLines={2}>
                        {title}
                      </Text>
                    ) : (
                      <View style={styles.titlePlaceholder} />
                    )}
                    {showCloseButton && (
                      <IconButton
                        icon="close"
                        size={24}
                        onPress={onClose}
                        style={styles.closeButton}
                        iconColor={colors.textSecondary}
                        accessibilityLabel="Cerrar modal"
                      />
                    )}
                  </View>
                )}

                {/* Content - Scrollable if needed */}
                <ScrollView
                  style={styles.contentScroll}
                  contentContainerStyle={styles.contentContainer}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

// Confirmation Modal variant
interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmDestructive?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmDestructive = false,
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      maxWidth={400}
      closeOnBackdrop={!loading}
    >
      <View style={styles.confirmContent}>
        <Text style={styles.confirmMessage}>{message}</Text>

        <View style={styles.confirmButtons}>
          <TouchableOpacity
            style={[styles.confirmButton, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>{cancelText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              confirmDestructive ? styles.destructiveButton : styles.primaryButton,
              loading && styles.disabledButton,
            ]}
            onPress={onConfirm}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Procesando...' : confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Alert Modal variant
interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export function AlertModal({
  visible,
  onClose,
  title,
  message,
  buttonText = 'Aceptar',
  type = 'info',
}: AlertModalProps) {
  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert';
      default:
        return 'information';
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showCloseButton={false}
      maxWidth={360}
    >
      <View style={styles.alertContent}>
        <View style={[styles.alertIconContainer, { backgroundColor: getTypeColor() + '20' }]}>
          <IconButton
            icon={getTypeIcon()}
            size={48}
            iconColor={getTypeColor()}
          />
        </View>

        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertMessage}>{message}</Text>

        <TouchableOpacity
          style={[styles.alertButton, { backgroundColor: getTypeColor() }]}
          onPress={onClose}
        >
          <Text style={styles.alertButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  fullScreenContainer: {
    padding: 0,
    flex: 1,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
    overflow: 'hidden',
  },
  fullScreenModal: {
    flex: 1,
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  titlePlaceholder: {
    flex: 1,
  },
  closeButton: {
    margin: 0,
  },
  contentScroll: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  // Confirm Modal styles
  confirmContent: {
    alignItems: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  destructiveButton: {
    backgroundColor: colors.error,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Alert Modal styles
  alertContent: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  alertIconContainer: {
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  alertMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  alertButton: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minHeight: 48,
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
});

export default Modal;
