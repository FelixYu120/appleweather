import React, { useState, useRef } from 'react';
import { View, StyleSheet, StatusBar, Modal, LayoutAnimation, Alert, Keyboard, FlatList } from 'react-native';
import WeatherSwiper from './screens/WeatherSwiper';
import MenuScreen from './screens/MenuScreen';
import i18n from '../lib/i18n';

// --- Type Definitions ---
interface City {
    id: string; // A truly unique identifier
    name: string; // The query string for the API, e.g., "Irvine,US"
}
type UnitSystem = 'imperial' | 'metric';


export default function App() {
    const [isMenuVisible, setMenuVisible] = useState(false);

    const [cities, setCities] = useState<City[]>([
        { id: 'Irvine, US', name: 'Irvine,US' },
        { id: 'London, GB', name: 'London,GB' },
        { id: 'Tokyo, JP', name: 'Tokyo,JP' },
    ]);

    const [units, setUnits] = useState<UnitSystem>('imperial');
    const [locale, setLocale] = useState(i18n.locale);
    const flatListRef = useRef<FlatList<any> | null>(null);

    const changeLocale = (newLocale: string) => {
        i18n.locale = newLocale;
        setLocale(newLocale);
    };

    const handleCitySelect = (cityId: string) => {
        const index = cities.findIndex(c => c.id === cityId);
        if (index !== -1) {
            flatListRef.current?.scrollToIndex({ animated: true, index });
        }
        setMenuVisible(false);
    };

    const addCity = (cityIdentifier: string) => {
        const newCityName = cityIdentifier.trim();
        if (newCityName && !cities.find(c => c.id.toLowerCase() === newCityName.toLowerCase())) {
            const newCity: City = {
                id: newCityName,
                name: newCityName
            };
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCities(prevCities => [...prevCities, newCity]);
            Keyboard.dismiss();
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
                setMenuVisible(false);
            }, 300);
        } else if (newCityName) {
            Alert.alert("City Exists", i18n.t('cityExists', { city: newCityName }));
        }
    };

    const deleteCity = (idToDelete: string) => {
        if (cities.length <= 1) {
            Alert.alert("Cannot Delete", "You must have at least one city.");
            return;
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCities(cities.filter((city) => city.id !== idToDelete));
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <WeatherSwiper
                cities={cities}
                onMenuPress={() => setMenuVisible(true)}
                units={units}
                lang={locale}
                flatListRef={flatListRef}
            />

            <Modal
                animationType="slide"
                transparent={false}
                visible={isMenuVisible}
                onRequestClose={() => setMenuVisible(false)}
            >
                <MenuScreen
                    savedCities={cities}
                    onClose={() => setMenuVisible(false)}
                    onCitySelect={handleCitySelect}
                    onAddCity={addCity}
                    onDeleteCity={deleteCity}
                    onChangeLocale={changeLocale}
                    currentLocale={locale}
                    onChangeUnits={setUnits}
                    currentUnits={units}
                />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
