import React, {createContext, useContext, useState, useEffect, ReactNode, useRef, RefObject} from 'react';
import {View, LayoutRectangle, ScrollView} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Walkthrough, WalkthroughStep} from '@/app/component/Walkthrough';

interface WalkthroughContextType {
    startWalkthrough: (key: string, steps: WalkthroughStep[]) => void;
    stopWalkthrough: () => void;
    isActive: boolean;
    currentStep: number;
    setCurrentStep: (step: number) => void;
    registerElement: (id: string, ref: RefObject<View | null>) => void;
    unregisterElement: (id: string) => void;
    registerScrollView: (ref: RefObject<ScrollView | null>) => void;
    unregisterScrollView: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

interface WalkthroughProviderProps {
    children: ReactNode;
}

export const WalkthroughProvider: React.FC<WalkthroughProviderProps> = ({children}) => {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [steps, setSteps] = useState<WalkthroughStep[]>([]);
    const [storageKey, setStorageKey] = useState('');
    const elementRefs = useRef<Map<string, RefObject<View | null>>>(new Map());
    const [elementPositions, setElementPositions] = useState<Map<string, LayoutRectangle>>(new Map());
    const scrollViewRef = useRef<RefObject<ScrollView | null> | null>(null);

    const registerElement = (id: string, ref: RefObject<View | null>) => {
        elementRefs.current.set(id, ref);
    };

    const unregisterElement = (id: string) => {
        elementRefs.current.delete(id);
    };

    const registerScrollView = (ref: RefObject<ScrollView | null>) => {
        scrollViewRef.current = ref;
    };

    const unregisterScrollView = () => {
        scrollViewRef.current = null;
    };

    const scrollToElement = (elementId: string) => {
        const position = elementPositions.get(elementId);
        const scrollView = scrollViewRef.current?.current;

        if (!position || !scrollView) {
            console.log('Cannot scroll: position or scrollView not available', {
                elementId,
                hasPosition: !!position,
                hasScrollView: !!scrollView
            });
            return;
        }

        console.log(`🔄 Scrolling to element "${elementId}"`, {
            windowY: position.y,
            scrollViewExists: !!scrollView,
        });

        // Get the element's ref for measureLayout
        const elementRef = elementRefs.current.get(elementId);

        if (elementRef?.current && scrollView) {
            // Try measureLayout to get position relative to ScrollView content
            try {
                (elementRef.current as any).measureLayout(
                    scrollView as any,
                    (x: number, y: number, width: number, height: number) => {
                        // y is now relative to ScrollView content origin (not window)
                        const padding = 100; // Padding from top
                        const scrollY = Math.max(0, y - padding);

                        console.log(`✅ measureLayout success for "${elementId}"`, {
                            elementYInScrollView: y,
                            windowY: position.y,
                            calculatedScrollY: scrollY
                        });

                        // Scroll with a small delay to ensure ScrollView is ready
                        setTimeout(() => {
                            scrollView.scrollTo({
                                y: scrollY,
                                animated: true,
                            });
                            console.log(`✅ scrollTo executed for "${elementId}" with y: ${scrollY}`);
                        }, 150);
                    },
                    () => {
                        // measureLayout failed - calculate from window position
                        // Account for: status bar (~50) + header (~100) + padding
                        const fixedOffset = 200; // Status bar + header + padding
                        const scrollY = Math.max(0, position.y - fixedOffset);

                        console.log(`📜 measureLayout failed, using window calc for "${elementId}"`, {
                            windowY: position.y,
                            fixedOffset,
                            calculatedScrollY: scrollY
                        });

                        setTimeout(() => {
                            scrollView.scrollTo({
                                y: scrollY,
                                animated: true,
                            });
                            console.log(`✅ Fallback scrollTo executed for "${elementId}" with y: ${scrollY}`);
                        }, 150);
                    }
                );
            } catch (error) {
                console.error('❌ measureLayout exception:', error);
                // Final fallback
                const scrollY = Math.max(0, position.y - 200);
                setTimeout(() => {
                    scrollView.scrollTo({
                        y: scrollY,
                        animated: true,
                    });
                }, 150);
            }
        } else {
            console.warn(`⚠️ Missing refs for "${elementId}"`, {
                hasElementRef: !!elementRef?.current,
                hasScrollView: !!scrollView,
            });
        }
    };

    const measureElements = (callback?: () => void) => {
        const positions = new Map<string, LayoutRectangle>();
        let measuredCount = 0;
        const totalElements = elementRefs.current.size;

        console.log(`Measuring ${totalElements} elements...`);

        if (totalElements === 0) {
            console.warn('No elements registered for measurement');
            if (callback) callback();
            return;
        }

        elementRefs.current.forEach((ref, id) => {
            if (ref.current) {
                // Use measureInWindow for more accurate positioning relative to window
                ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                    const position = {
                        x,
                        y,
                        width,
                        height,
                    };
                    positions.set(id, position);
                    measuredCount++;
                    console.log(`✓ Measured element "${id}":`, position);

                    // When all elements are measured, update state
                    if (measuredCount === totalElements) {
                        console.log('All elements measured, updating positions');
                        setElementPositions(new Map(positions));
                        if (callback) callback();
                    }
                });
            } else {
                console.warn(`Ref for "${id}" is null`);
                measuredCount++;
                if (measuredCount === totalElements && callback) {
                    callback();
                }
            }
        });
    };

    const startWalkthrough = async (key: string, walkthroughSteps: WalkthroughStep[]) => {
        try {
            // For testing - remove storage check
            // const status = await AsyncStorage.getItem(key);
            // if (status === 'true' || status === 'skipped') {
            //   return; // Don't show if already completed/skipped
            // }

            console.log('Starting walkthrough:', key, walkthroughSteps.length, 'steps');
            console.log('Registered elements:', Array.from(elementRefs.current.keys()));

            // Reset state first
            setCurrentStep(0);
            setSteps(walkthroughSteps);
            setStorageKey(key);

            // Measure elements and then start walkthrough
            measureElements(() => {
                // After measurement completes, activate walkthrough
                setTimeout(() => {
                    setIsActive(true);
                    console.log('Walkthrough activated');
                }, 100);
            });
        } catch (error) {
            console.error('Error starting walkthrough:', error);
        }
    };

    const stopWalkthrough = () => {
        setIsActive(false);
        setCurrentStep(0);
        setSteps([]);
        setStorageKey('');
    };

    const handleComplete = () => {
        stopWalkthrough();
    };

    const handleSkip = () => {
        stopWalkthrough();
    };

    // Update steps with measured positions and scroll to current step
    useEffect(() => {
        if (isActive && steps.length > 0 && currentStep < steps.length) {
            const currentStepId = steps[currentStep]?.id;
            if (currentStepId) {
                // Wait a bit for layout to settle, then scroll
                const scrollTimeout = setTimeout(() => {
                    scrollToElement(currentStepId);
                }, 400); // Increased delay to ensure layout is complete

                return () => clearTimeout(scrollTimeout);
            }
        }
    }, [currentStep, isActive, steps, elementPositions]);

    const stepsWithPositions = steps.map(step => {
        const position = elementPositions.get(step.id);
        return {
            ...step,
            highlight: position ? {
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height,
            } : undefined,
        };
    });

    return (
        <WalkthroughContext.Provider
            value={{
                startWalkthrough,
                stopWalkthrough,
                isActive,
                currentStep,
                setCurrentStep,
                registerElement,
                unregisterElement,
                registerScrollView,
                unregisterScrollView,
            }}
        >
            {children}
            <Walkthrough
                visible={isActive}
                steps={stepsWithPositions}
                onComplete={handleComplete}
                onSkip={handleSkip}
                storageKey={storageKey}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
            />
        </WalkthroughContext.Provider>
    );
};

export const useWalkthrough = () => {
    const context = useContext(WalkthroughContext);
    if (!context) {
        throw new Error('useWalkthrough must be used within WalkthroughProvider');
    }
    return context;
};
