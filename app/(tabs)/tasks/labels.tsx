import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {AppWrapper} from '@/app/component/AppWrapper';
import {Feather} from '@expo/vector-icons';
import {useState, useEffect, useCallback} from 'react';
import {getTaskLabels, createTaskLabel, updateTaskLabel, deleteTaskLabel, TaskLabel} from '@/services/templateService';
import {getUserData} from '@/services/authService';

interface Label {
    id: string;
    name: string;
    color: string;
    created_by?: string;
    _id?: string;
}

export default function LabelsScreen() {
    const [activeTab, setActiveTab] = useState<'All' | 'Pre-Built' | 'Mine'>('All');
    const [allLabels, setAllLabels] = useState<Label[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [labelToDelete, setLabelToDelete] = useState<Label | null>(null);
    const [labelName, setLabelName] = useState('');
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const colorOptions = [
        {name: 'Red', value: '#EF4444'},
        {name: 'Blue', value: '#3B82F6'},
        {name: 'Green', value: '#10B981'},
        {name: 'Yellow', value: '#FCD34D'},
        {name: 'Purple', value: '#C084FC'},
        {name: 'Pink', value: '#F472B6'},
        {name: 'Orange', value: '#FB923C'},
        {name: 'Teal', value: '#14B8A6'},
        {name: 'Indigo', value: '#6366F1'},
        {name: 'Gray', value: '#6B7280'},
        {name: 'Black', value: '#000000'},
        {name: 'Brown', value: '#8B4513'},
    ];

    // Validate label name and color uniqueness
    const validateLabel = (name: string, color: string, excludeLabelId?: string | null): string | null => {
        const trimmedName = name.trim().toLowerCase();

        // Check for duplicate name (case-insensitive), excluding current label if editing
        const duplicateName = allLabels.find(
            (label) =>
                (label.name || '').toLowerCase() === trimmedName &&
                (excludeLabelId ? label.id !== excludeLabelId : true)
        );
        if (duplicateName) {
            return `A label with the name "${name}" already exists`;
        }

        // Check for duplicate color, excluding current label if editing
        const duplicateColor = allLabels.find(
            (label) =>
                label.color === color &&
                (excludeLabelId ? label.id !== excludeLabelId : true)
        );
        if (duplicateColor) {
            return `The color "${colorOptions.find(c => c.value === color)?.name || color}" is already used by "${duplicateColor.name}"`;
        }

        return null;
    };

    const handleOpenEditModal = (label: Label) => {
        setEditingLabelId(label.id);
        setLabelName(label.name);
        setSelectedColor(label.color);
        setValidationError(null);
        setShowAddModal(true);
    };

    const handleOpenAddModal = () => {
        setEditingLabelId(null);
        setLabelName('');
        setSelectedColor('');
        setValidationError(null);
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingLabelId(null);
        setLabelName('');
        setSelectedColor('');
        setValidationError(null);
    };

    const handleSaveLabel = async () => {
        setValidationError(null);

        if (!labelName.trim()) {
            setValidationError('Label name is required');
            return;
        }

        if (!selectedColor) {
            setValidationError('Please select a color');
            return;
        }

        // Validate for duplicates (exclude current label if editing)
        const validation = validateLabel(labelName.trim(), selectedColor, editingLabelId);
        if (validation) {
            setValidationError(validation);
            return;
        }

        try {
            setSaving(true);

            if (editingLabelId) {
                // Update existing label
                await updateTaskLabel(editingLabelId, {
                    title: labelName.trim(),
                    description: labelName.trim(),
                    color: selectedColor,
                });

                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Label updated successfully',
                    position: 'top',
                });
            } else {
                // Create new label
                await createTaskLabel({
                    title: labelName.trim(),
                    description: labelName.trim(),
                    color: selectedColor,
                });

                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Label created successfully',
                    position: 'top',
                });
            }

            // Reset form and close modal
            handleCloseModal();

            // Reload labels
            await loadLabels();
        } catch (err: any) {
            console.error(`Error ${editingLabelId ? 'updating' : 'creating'} label:`, err);
            const errorMessage = err.message || `Failed to ${editingLabelId ? 'update' : 'create'} label`;

            // Check if it's a duplicate color error from backend
            if (errorMessage.includes('color already exists')) {
                setValidationError(`The selected color is already in use`);
            } else {
                setValidationError(errorMessage);
            }

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: errorMessage,
                position: 'top',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLabel = async () => {
        if (!labelToDelete) return;

        try {
            setDeleting(true);

            await deleteTaskLabel(labelToDelete.id);

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Label deleted successfully',
                position: 'top',
            });

            setShowDeleteModal(false);
            setLabelToDelete(null);

            // Reload labels
            await loadLabels();
        } catch (err: any) {
            console.error('Error deleting label:', err);
            const errorMessage = err.message || 'Failed to delete label';

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: errorMessage,
                position: 'top',
            });
        } finally {
            setDeleting(false);
        }
    };

    const handleColorSelect = (color: string) => {
        setSelectedColor(color);
    };

    // Get current user ID
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await getUserData();
                if (userData?.id) {
                    setCurrentUserId(userData.id);
                }
            } catch (err) {
                console.error('Error fetching user:', err);
            }
        };
        fetchUser();
    }, []);

    // Fetch labels from backend
    const loadLabels = useCallback(async () => {
        try {
            setError(null);
            const taskLabels = await getTaskLabels();

            // Convert TaskLabel to Label format
            const formattedLabels: Label[] = taskLabels.map((label) => ({
                id: String(label._id || label.id || ''),
                name: label.name || label.title || '',
                color: label.color || '#F6B8A3', // Default color if not provided
                created_by: String((label as any).created_by || ''),
                _id: String(label._id || label.id || ''),
            }));

            setAllLabels(formattedLabels);

            // Filter labels based on active tab
            filterLabels(formattedLabels, activeTab, currentUserId);
        } catch (err: any) {
            console.error('Error loading labels:', err);
            setError(err.message || 'Failed to load labels');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, currentUserId]);

    // Filter labels based on tab
    const filterLabels = useCallback((allLabelsList: Label[], tab: 'All' | 'Pre-Built' | 'Mine', userId: string | null) => {
        if (!userId) {
            // If no user ID, show all labels
            setLabels(allLabelsList);
            return;
        }

        if (tab === 'All') {
            // Show all labels
            setLabels(allLabelsList);
        } else if (tab === 'Mine') {
            // Show only labels created by current user
            const mineLabels = allLabelsList.filter(
                (label) => String(label.created_by) === String(userId)
            );
            setLabels(mineLabels);
        } else {
            // Show labels NOT created by current user (Pre-Built)
            const prebuiltLabels = allLabelsList.filter(
                (label) => String(label.created_by) !== String(userId)
            );
            setLabels(prebuiltLabels);
        }
    }, []);

    // Update filtered labels when tab changes
    useEffect(() => {
        if (allLabels.length > 0) {
            filterLabels(allLabels, activeTab, currentUserId);
        }
    }, [activeTab, allLabels, currentUserId, filterLabels]);

    // Load labels on mount
    useEffect(() => {
        loadLabels();
    }, [loadLabels]);

    // Refresh labels
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadLabels();
    }, [loadLabels]);

    return (
        <AppWrapper headerTitle="Labels" headerVariant="default">
            <View style={styles.container}>
                {/* Filter Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'All' && styles.tabActive]}
                        onPress={() => setActiveTab('All')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'All' && styles.tabTextActive,
                            ]}
                        >
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Pre-Built' && styles.tabActive]}
                        onPress={() => setActiveTab('Pre-Built')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'Pre-Built' && styles.tabTextActive,
                            ]}
                        >
                            Pre-Built
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Mine' && styles.tabActive]}
                        onPress={() => setActiveTab('Mine')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'Mine' && styles.tabTextActive,
                            ]}
                        >
                            Mine
                        </Text>
                    </TouchableOpacity>
                </View>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#F6B8A3"/>
                        <Text style={styles.loadingText}>Loading labels...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <Feather name="alert-circle" size={48} color="#EF4444"/>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setLoading(true);
                                loadLabels();
                            }}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.labelsList}
                        contentContainerStyle={styles.labelsContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                        }
                    >
                        {labels.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Feather name="tag" size={48} color="#9CA3AF"/>
                                <Text style={styles.emptyText}>No labels available</Text>
                                <Text style={styles.emptySubtext}>
                                    Contact your clinic to create labels
                                </Text>
                            </View>
                        ) : (
                            labels.map((label) => {
                                const isMine = currentUserId && String(label.created_by) === String(currentUserId);
                                return (
                                    <View key={label.id} style={styles.labelCard}>
                                        <View
                                            style={[styles.colorBar, {backgroundColor: label.color}]}
                                        />
                                        <Text style={styles.labelText}>{label.name}</Text>
                                        {activeTab === 'Mine' && isMine && (
                                            <View style={styles.labelActions}>
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => handleOpenEditModal(label)}
                                                >
                                                    <Feather name="edit-2" size={18} color="#3B82F6"/>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => {
                                                        setLabelToDelete(label);
                                                        setShowDeleteModal(true);
                                                    }}
                                                >
                                                    <Feather name="trash-2" size={18} color="#EF4444"/>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                )}

                {/* Add More Labels Button - Show for All and Mine tabs */}
                {(activeTab === 'All' || activeTab === 'Mine') && (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleOpenAddModal}
                    >
                        <Feather name="plus" size={20} color="#1A1D1F"/>
                        <Text style={styles.addButtonText}>Add More Labels</Text>
                    </TouchableOpacity>
                )}

                {/* Add New Label Modal */}
                <Modal
                    visible={showAddModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowAddModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={handleCloseModal}
                        />
                        <View style={styles.modalContainer}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {editingLabelId ? 'Edit Label' : 'Add New Labels'}
                                </Text>
                                <TouchableOpacity
                                    onPress={handleCloseModal}
                                    style={styles.modalCloseButton}
                                >
                                    <Feather name="x" size={24} color="#1A1D1F"/>
                                </TouchableOpacity>
                            </View>

                            {/* Modal Content */}
                            <View style={styles.modalContent}>
                                {/* Labels Name Input */}
                                <View style={styles.inputGroup}>
                                    <View style={styles.inputLabelContainer}>
                                        <Text style={styles.inputLabel}>Labels Name</Text>
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter labels name"
                                        placeholderTextColor="#9CA3AF"
                                        value={labelName}
                                        onChangeText={setLabelName}
                                    />
                                </View>

                                {/* Labels Color Selection */}
                                <View style={styles.inputGroup}>
                                    <View style={styles.inputLabelContainer}>
                                        <Text style={styles.inputLabel}>Labels Color</Text>
                                    </View>
                                    <View style={styles.colorPickerContainer}>
                                        <Text style={styles.colorPickerTitle}>
                                            Select Color
                                        </Text>
                                        <ScrollView
                                            style={styles.colorOptionsScrollView}
                                            contentContainerStyle={styles.colorOptionsList}
                                            showsVerticalScrollIndicator={true}
                                            nestedScrollEnabled={true}
                                        >
                                            {colorOptions.map((color) => {
                                                const isSelected = selectedColor === color.value;
                                                return (
                                                    <TouchableOpacity
                                                        key={color.value}
                                                        style={[
                                                            styles.colorOption,
                                                            isSelected && styles.colorOptionSelected,
                                                        ]}
                                                        onPress={() => handleColorSelect(color.value)}
                                                    >
                                                        <View
                                                            style={[
                                                                styles.colorSquare,
                                                                {backgroundColor: color.value},
                                                            ]}
                                                        />
                                                        <Text style={[
                                                            styles.colorOptionText,
                                                            isSelected && styles.colorOptionTextSelected,
                                                        ]}>
                                                            {color.name}
                                                        </Text>
                                                        <View style={[
                                                            styles.checkbox,
                                                            isSelected && styles.checkboxSelected,
                                                        ]}>
                                                            {isSelected && (
                                                                <Feather name="check" size={16} color="#1A1D1F"/>
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                </View>

                                {/* Validation Error */}
                                {validationError && (
                                    <View style={styles.validationErrorContainer}>
                                        <Feather name="alert-circle" size={16} color="#EF4444"/>
                                        <Text style={styles.validationErrorText}>{validationError}</Text>
                                    </View>
                                )}

                                {/* Save Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.saveButton,
                                        (!labelName.trim() || !selectedColor || saving) &&
                                        styles.saveButtonDisabled,
                                    ]}
                                    onPress={handleSaveLabel}
                                    disabled={!labelName.trim() || !selectedColor || saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#1A1D1F"/>
                                    ) : (
                                        <Text style={styles.saveButtonText}>
                                            {editingLabelId ? 'Update' : 'Save'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    visible={showDeleteModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.deleteModalContainer}>
                            <Text style={styles.deleteModalTitle}>Delete Label</Text>
                            <Text style={styles.deleteModalText}>
                                Are you sure you want to delete "{labelToDelete?.name}"? This action cannot be undone.
                            </Text>
                            <View style={styles.deleteModalActions}>
                                <TouchableOpacity
                                    style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                                    onPress={() => {
                                        setShowDeleteModal(false);
                                        setLabelToDelete(null);
                                    }}
                                    disabled={deleting}
                                >
                                    <Text style={styles.deleteModalButtonCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.deleteModalButton, styles.deleteModalButtonDelete]}
                                    onPress={handleDeleteLabel}
                                    disabled={deleting}
                                >
                                    {deleting ? (
                                        <ActivityIndicator size="small" color="#fff"/>
                                    ) : (
                                        <Text style={styles.deleteModalButtonDeleteText}>Delete</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </AppWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f4f2',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 12,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tabActive: {
        backgroundColor: '#F6B8A3',
        borderColor: '#F6B8A3',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
    },
    tabTextActive: {
        fontWeight: '600',
    },
    labelsList: {
        flex: 1,
    },
    labelsContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100,
    },
    labelCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    colorBar: {
        width: 4,
        height: '100%',
    },
    labelText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#1A1D1F',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    addButton: {
        width: '90%',
        alignSelf: 'center',
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalContent: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabelContainer: {
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8B4513',
        backgroundColor: '#F6B8A3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1A1D1F',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    colorInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    colorInputContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    colorPreview: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    colorInputText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    colorInputTextSelected: {
        color: '#1A1D1F',
        fontWeight: '500',
    },
    colorPickerContainer: {
        marginTop: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        maxHeight: 300,
    },
    colorPickerTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 12,
    },
    colorOptionsScrollView: {
        maxHeight: 240,
    },
    colorOptionsList: {
        gap: 0,
        paddingRight: 4,
    },
    colorOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 12,
        backgroundColor: 'transparent',
    },
    colorSquare: {
        width: 20,
        height: 20,
        borderRadius: 4,
    },
    colorOptionSelected: {
        backgroundColor: '#FEF3F2',
    },
    colorOptionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '400',
        color: '#1A1D1F',
    },
    colorOptionTextSelected: {
        fontWeight: '600',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkboxSelected: {
        borderColor: '#1A1D1F',
        backgroundColor: '#F6B8A3',
    },
    saveButton: {
        backgroundColor: '#F6B8A3',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonDisabled: {
        backgroundColor: '#E5E7EB',
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1D1F',
    },
    validationErrorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        gap: 8,
    },
    validationErrorText: {
        flex: 1,
        fontSize: 14,
        color: '#EF4444',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#F6B8A3',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    labelActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingRight: 12,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
    },
    deleteModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '90%',
        maxWidth: 400,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1D1F',
        marginBottom: 12,
    },
    deleteModalText: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 24,
        lineHeight: 22,
    },
    deleteModalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteModalButtonCancel: {
        backgroundColor: '#F3F4F6',
    },
    deleteModalButtonCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    deleteModalButtonDelete: {
        backgroundColor: '#EF4444',
    },
    deleteModalButtonDeleteText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

