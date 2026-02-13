import React, {useEffect, useRef, useState} from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import {Feather} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

export interface WalkthroughStep {
    id: string;
    title: string;
    description: string;
    target?: string; // ref name or element identifier
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    highlight?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

interface WalkthroughProps {
    visible: boolean;
    steps: WalkthroughStep[];
    onComplete: () => void;
    onSkip: () => void;
    storageKey: string;
    currentStep: number;
    onStepChange: (step: number) => void;
}

export const Walkthrough: React.FC<WalkthroughProps> = ({
                                                            visible,
                                                            steps,
                                                            onComplete,
                                                            onSkip,
                                                            storageKey,
                                                            currentStep,
                                                            onStepChange,
                                                        }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [highlightPosition, setHighlightPosition] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);

    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Update highlight position if step has highlight info
            const step = steps[currentStep];
            console.log('Walkthrough step changed:', {
                currentStep,
                stepId: step?.id,
                hasHighlight: !!step?.highlight,
                highlight: step?.highlight,
            });

            if (step?.highlight) {
                setHighlightPosition(step.highlight);
            } else {
                setHighlightPosition(null);
            }
        } else {
            fadeAnim.setValue(0);
            setHighlightPosition(null);
        }
    }, [visible, currentStep, steps]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            const nextStep = currentStep + 1;
            onStepChange(nextStep);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            onStepChange(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        try {
            await AsyncStorage.setItem(storageKey, 'true');
            onComplete();
        } catch (error) {
            console.error('Error saving walkthrough completion:', error);
            onComplete();
        }
    };

    const handleSkip = async () => {
        try {
            await AsyncStorage.setItem(storageKey, 'skipped');
            onSkip();
        } catch (error) {
            console.error('Error saving walkthrough skip:', error);
            onSkip();
        }
    };

    if (!visible || steps.length === 0 || currentStep >= steps.length) return null;

    const step = steps[currentStep];
    if (!step) return null;

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;

    // Calculate tooltip position
    const getTooltipPosition = () => {
        if (!highlightPosition || highlightPosition.height === 0) {
            // Center tooltip if no highlight or invalid highlight
            return {
                top: SCREEN_HEIGHT * 0.3,
                left: 20,
                right: 20,
                bottom: undefined,
            };
        }

        const {y, height} = highlightPosition;
        const tooltipHeight = 220; // Approximate tooltip height
        const spacing = 20;
        const safeAreaTop = 50;
        const safeAreaBottom = 100;

        // Validate highlight position is on screen
        if (y < 0 || y > SCREEN_HEIGHT || height <= 0) {
            // Invalid position, center tooltip
            return {
                top: SCREEN_HEIGHT * 0.3,
                left: 20,
                right: 20,
                bottom: undefined,
            };
        }

        // Position tooltip above or below highlight
        if (y > SCREEN_HEIGHT / 2) {
            // Show above highlight
            const topPos = Math.max(safeAreaTop, y - tooltipHeight - spacing);
            return {
                top: topPos,
                left: 20,
                right: 20,
                bottom: undefined,
            };
        } else {
            // Show below highlight
            const topPos = Math.min(
                SCREEN_HEIGHT - tooltipHeight - safeAreaBottom,
                y + height + spacing
            );
            return {
                top: topPos,
                left: 20,
                right: 20,
                bottom: undefined,
            };
        }
    };

    const tooltipStyle = getTooltipPosition();

    console.log('Walkthrough render:', {
        visible,
        currentStep,
        stepId: step?.id,
        hasHighlight: !!highlightPosition,
        tooltipStyle,
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleSkip}
            hardwareAccelerated={true}
            statusBarTranslucent={true}
            presentationStyle="overFullScreen"
        >
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {/* Render highlighted element on top with higher z-index */}
                {highlightPosition && (
                    <View
                        style={[
                            {
                                position: 'absolute',
                                left: highlightPosition.x,
                                top: highlightPosition.y,
                                width: highlightPosition.width,
                                height: highlightPosition.height,
                                zIndex: 1003,
                                elevation: 1003,
                            },
                        ]}
                        pointerEvents="none"
                        collapsable={false}
                    />
                )}
                <Animated.View
                    style={[
                        styles.overlay,
                        {
                            opacity: fadeAnim,
                        },
                    ]}
                    pointerEvents="box-none"
                    collapsable={false}
                >
                    {/* Dark overlay - only blocks background, allows highlighted area and tooltip */}
                    <View style={styles.overlayContainer} pointerEvents="box-none">
                        {highlightPosition && highlightPosition.height > 0 && highlightPosition.width > 0 && highlightPosition.y >= 0 && highlightPosition.y < SCREEN_HEIGHT ? (
                            <>
                                {/* Top dark area */}
                                {highlightPosition.y > 10 && (
                                    <View
                                        style={[
                                            styles.darkArea,
                                            {
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: Math.max(0, highlightPosition.y - 10),
                                            },
                                        ]}
                                        pointerEvents="auto"
                                    />
                                )}

                                {/* Left dark area */}
                                {highlightPosition.x > 10 && (
                                    <View
                                        style={[
                                            styles.darkArea,
                                            {
                                                top: Math.max(0, highlightPosition.y - 10),
                                                left: 0,
                                                width: Math.max(0, highlightPosition.x - 10),
                                                height: highlightPosition.height + 20,
                                            },
                                        ]}
                                        pointerEvents="auto"
                                    />
                                )}

                                {/* Right dark area */}
                                {(highlightPosition.x + highlightPosition.width + 10) < SCREEN_WIDTH && (
                                    <View
                                        style={[
                                            styles.darkArea,
                                            {
                                                top: Math.max(0, highlightPosition.y - 10),
                                                left: highlightPosition.x + highlightPosition.width + 10,
                                                right: 0,
                                                height: highlightPosition.height + 20,
                                            },
                                        ]}
                                        pointerEvents="auto"
                                    />
                                )}

                                {/* Bottom dark area */}
                                {(highlightPosition.y + highlightPosition.height + 10) < SCREEN_HEIGHT && (
                                    <View
                                        style={[
                                            styles.darkArea,
                                            {
                                                top: highlightPosition.y + highlightPosition.height + 10,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                            },
                                        ]}
                                        pointerEvents="auto"
                                    />
                                )}

                                {/* Highlight cutout - allows touches to pass through to underlying element */}
                                <View
                                    style={[
                                        styles.highlightCutout,
                                        {
                                            left: Math.max(0, highlightPosition.x - 10),
                                            top: Math.max(0, highlightPosition.y - 10),
                                            width: highlightPosition.width + 20,
                                            height: highlightPosition.height + 20,
                                            zIndex: 999,
                                        },
                                    ]}
                                    pointerEvents="none"
                                    collapsable={false}
                                />
                            </>
                        ) : (
                            /* Full overlay when no highlight - but lighter */
                            <View
                                style={[
                                    styles.darkArea,
                                    {
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                    },
                                ]}
                                pointerEvents="auto"
                            />
                        )}
                    </View>

                    {/* Tooltip - must be interactive and always on top, but not blocking highlighted element */}
                    <Animated.View
                        style={[
                            styles.tooltip,
                            tooltipStyle,
                            {
                                opacity: fadeAnim,
                            },
                        ]}
                        pointerEvents="box-none"
                        collapsable={false}
                    >
                        <View
                            style={styles.tooltipContent}
                            pointerEvents="auto"
                            collapsable={false}
                        >
                            {/* Step indicator */}
                            <View style={styles.stepIndicator}>
                                <Text style={styles.stepText}>
                                    {currentStep + 1} / {steps.length}
                                </Text>
                            </View>

                            {/* Title */}
                            <Text style={styles.tooltipTitle}>{step.title}</Text>

                            {/* Description */}
                            <Text style={styles.tooltipDescription}>{step.description}</Text>

                            {/* Navigation buttons */}
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.skipButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleSkip();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.skipButtonText}>Skip</Text>
                                </TouchableOpacity>

                                <View style={styles.navButtons}>
                                    {!isFirstStep && (
                                        <TouchableOpacity
                                            style={styles.prevButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handlePrevious();
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Feather name="chevron-left" size={20} color="#1A1D1F"/>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={styles.nextButton}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            handleNext();
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.nextButtonText}>
                                            {isLastStep ? 'Got it!' : 'Next'}
                                        </Text>
                                        {!isLastStep && (
                                            <Feather name="chevron-right" size={20} color="#1A1D1F"/>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    darkArea: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    highlightCutout: {
        position: 'absolute',
        borderRadius: 12,
        backgroundColor: 'transparent',
        borderWidth: 3,
        borderColor: '#F6B8A3',
        shadowColor: '#F6B8A3',
        shadowOffset: {width: 0, height: 0},
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
    tooltip: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 20,
        zIndex: 1001,
        minWidth: SCREEN_WIDTH - 40,
    },
    tooltipContent: {
        width: '100%',
        flex: 1,
    },
    stepIndicator: {
        alignSelf: 'flex-start',
        backgroundColor: '#F6B8A3',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
    },
    stepText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1D1F',
    },
    tooltipTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1D1F',
        marginBottom: 8,
    },
    tooltipDescription: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skipButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 44,
        minWidth: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButtonText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    navButtons: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    prevButton: {
        width: 44,
        height: 44,
        minWidth: 44,
        minHeight: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#F6B8A3',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        minHeight: 44,
        minWidth: 80,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1D1F',
    },
});
