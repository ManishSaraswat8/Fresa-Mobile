import React, {createContext, ReactNode, useContext, useMemo} from 'react';
import CrudService from '../services/CrudService';
import Toast from 'react-native-toast-message';
import {useLoader} from '@/providers/LoaderProvider';
import {useAppSelector} from '@/store';

interface CrudProviderProps {
    children: ReactNode;
}

const CrudContext = createContext<CrudService<any> | null>(null);

export const CrudProvider: React.FC<CrudProviderProps> = ({children}) => {
    const {setLoading} = useLoader();
    const currentUser = useAppSelector((state) => state.user.currentUser);

    const crudService = useMemo(() => {
        const notify = (message: string, type: 'success' | 'error') => {
            Toast.show({
                type: type === 'success' ? 'success' : 'error',
                text1: message,
            });
        };

        // CrudService now automatically retrieves tokens from AsyncStorage
        return new CrudService(setLoading, notify);
    }, [setLoading]);

    return (
        <CrudContext.Provider value={crudService}>
            {children}
        </CrudContext.Provider>
    );
};

export const useCrudService = <T, >(): CrudService<T> => {
    const context = useContext(CrudContext);
    if (!context) {
        throw new Error('useCrudService must be used within a CrudProvider');
    }
    return context as CrudService<T>;
};

