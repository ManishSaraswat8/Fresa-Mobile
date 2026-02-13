import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import {Feather} from '@expo/vector-icons';

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog = ({
                                  visible,
                                  title,
                                  message,
                                  confirmText = 'Confirm',
                                  cancelText = 'Cancel',
                                  onConfirm,
                                  onCancel,
                                  type = 'danger',
                              }: ConfirmDialogProps) => {
    const getConfirmButtonColor = () => {
        switch (type) {
            case 'danger':
                return '#EF4444';
            case 'warning':
                return '#F59E0B';
            case 'info':
                return '#8B4513';
            default:
                return '#EF4444';
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onCancel}
                />
                <View style={styles.container} onStartShouldSetResponder={() => true}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Feather
                                name={type === 'danger' ? 'alert-triangle' : 'info'}
                                size={24}
                                color={getConfirmButtonColor()}
                            />
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity
                            onPress={onCancel}
                            style={styles.closeButton}
                        >
                            <Feather name="x" size={20} color="#6B7280"/>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <Text style={styles.message}>{message}</Text>

                        <View style={styles.buttons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={onCancel}
                            >
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.confirmButton,
                                    {backgroundColor: getConfirmButtonColor()},
                                ]}
                                onPress={onConfirm}
                            >
                                <Text style={styles.confirmButtonText}>{confirmText}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '85%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    message: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 24,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

