// <ANTIGRAVITY_DEV_ONLY>
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, SafeAreaView } from 'react-native';
import { useStore } from '../store/useStore';
import { COLORS, FONTS } from '../constants/theme';

export default function DevModeToggle() {
    const { isDevMode, setDevMode } = useStore();

    return (
        <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
            <TouchableOpacity
                style={[styles.container, isDevMode && styles.active]}
                onPress={() => setDevMode(!isDevMode)}
                activeOpacity={0.8}
            >
                <Text style={[styles.text, isDevMode && styles.activeText]}>
                    DEV: {isDevMode ? 'ON' : 'OFF'}
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 9999,
    },
    container: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
        marginTop: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    active: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    text: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    activeText: {
        color: COLORS.textLight,
    },
});
// </ANTIGRAVITY_DEV_ONLY>
