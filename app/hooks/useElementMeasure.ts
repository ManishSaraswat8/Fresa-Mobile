import {useRef, useCallback} from 'react';
import {View, LayoutRectangle} from 'react-native';

export const useElementMeasure = () => {
    const ref = useRef<View>(null);
    const measureCallback = useCallback(
        (callback: (layout: LayoutRectangle) => void) => {
            ref.current?.measure((x, y, width, height, pageX, pageY) => {
                callback({
                    x: pageX,
                    y: pageY,
                    width,
                    height,
                });
            });
        },
        []
    );

    return {ref, measure: measureCallback};
};
