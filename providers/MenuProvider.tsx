import React, {createContext, useContext, useState, ReactNode} from 'react';
import {Menu} from '@/app/component/Menu';

interface MenuContextType {
    isMenuOpen: boolean;
    openMenu: () => void;
    closeMenu: () => void;
    toggleMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const useMenu = () => {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
};

interface MenuProviderProps {
    children: ReactNode;
}

export const MenuProvider: React.FC<MenuProviderProps> = ({children}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const openMenu = () => setIsMenuOpen(true);
    const closeMenu = () => setIsMenuOpen(false);
    const toggleMenu = () => setIsMenuOpen((prev) => !prev);

    return (
        <MenuContext.Provider value={{isMenuOpen, openMenu, closeMenu, toggleMenu}}>
            {children}
            <Menu visible={isMenuOpen} onClose={closeMenu}/>
        </MenuContext.Provider>
    );
};

