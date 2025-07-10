import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { X, Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, LucideProps, MapPin, Trash2, MoreVertical } from 'lucide-react-native';
import i18n from '../../lib/i18n';

// --- Type Definitions ---
type UnitSystem = 'imperial' | 'metric';
interface City {
    id: string;
    name: string;
}
interface Suggestion {
    name: string;
    country: string;
    state?: string;
}
interface WeatherIconProps {
    condition: string;
    size?: number;
}

// --- Helper Components ---
const WeatherIcon: React.FC<WeatherIconProps> = ({ condition, size = 48 }) => {
    let IconComponent: React.ElementType<LucideProps> = Sun;
    const props: LucideProps = { size, color: "white" };
    if (condition?.includes('Clear')) IconComponent = Sun;
    if (condition?.includes('Clouds')) IconComponent = Cloud;
    if (condition?.includes('Rain')) IconComponent = CloudRain;
    if (condition?.includes('Drizzle')) IconComponent = CloudDrizzle;
    if (condition?.includes('Snow')) IconComponent = CloudSnow;
    if (condition?.includes('Thunderstorm')) IconComponent = CloudLightning;
    if (condition?.includes('Mist') || condition?.includes('Fog') || condition?.includes('Haze')) IconComponent = Cloud;
    return <IconComponent {...props} />;
};

const CityListItem = ({ city, onSelect, onDelete }: { city: City, onSelect: () => void, onDelete: () => void }) => {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const getLocalTime = (timezoneOffset: number) => {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const cityTime = new Date(utc + (timezoneOffset * 1000));
        return cityTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        const fetchCityWeather = async () => {
            setLoading(true);
            const API_KEY = "92039782b40df7e3e22ad777f7167e91";
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city.name}&units=imperial&appid=${API_KEY}`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                if (response.ok) setWeather(data);
            } catch (e) { console.error("Failed to fetch city list weather", e); }
            finally { setLoading(false); }
        };
        fetchCityWeather();
    }, [city]);

    return (
        <View style={styles.cityItemContainer}>
            <TouchableOpacity onPress={onSelect} style={styles.cityItem}>
                {loading || !weather ? <ActivityIndicator color="white" /> : (
                    <>
                        <View>
                            <Text style={styles.cityName}>{weather.name}</Text>
                            <Text style={styles.localTime}>{getLocalTime(weather.timezone)}</Text>
                        </View>
                        <View style={styles.cityWeatherInfo}>
                            <WeatherIcon condition={weather.weather[0].main} size={32} />
                            <Text style={styles.cityTemp}>{Math.round(weather.main.temp)}°</Text>
                        </View>
                    </>
                )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                <Trash2 size={24} color="#ff4757" />
            </TouchableOpacity>
        </View>
    );
};

// --- Settings Screen ---
const SettingsScreen = ({ onClose, onChangeLocale, currentLocale, onChangeUnits, currentUnits }: { onClose: () => void; onChangeLocale: (l: string) => void; currentLocale: string; onChangeUnits: (u: UnitSystem) => void; currentUnits: UnitSystem; }) => (
    <View style={styles.menuContainer}>
        <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.header}><Text style={styles.headerTitle}>{i18n.t('settings')}</Text><TouchableOpacity onPress={onClose} style={styles.closeButton}><X size={28} color="white" /></TouchableOpacity></View>
            <ScrollView style={styles.scrollViewPadding}>
                <View style={styles.settingGroup}><Text style={styles.settingLabel}>{i18n.t('temperature')}</Text><View style={styles.toggleGroup}><TouchableOpacity onPress={() => onChangeUnits('imperial')} style={[styles.toggleButton, currentUnits === 'imperial' && styles.toggleButtonActive]}><Text style={styles.toggleButtonText}>{i18n.t('fahrenheit')}</Text></TouchableOpacity><TouchableOpacity onPress={() => onChangeUnits('metric')} style={[styles.toggleButton, currentUnits === 'metric' && styles.toggleButtonActive]}><Text style={styles.toggleButtonText}>{i18n.t('celsius')}</Text></TouchableOpacity></View></View>
                <View style={styles.settingGroup}><Text style={styles.settingLabel}>{i18n.t('language')}</Text><View style={styles.toggleGroup}><TouchableOpacity onPress={() => onChangeLocale('en')} style={[styles.toggleButton, currentLocale.startsWith('en') && styles.toggleButtonActive]}><Text style={styles.toggleButtonText}>EN</Text></TouchableOpacity><TouchableOpacity onPress={() => onChangeLocale('es')} style={[styles.toggleButton, currentLocale.startsWith('es') && styles.toggleButtonActive]}><Text style={styles.toggleButtonText}>ES</Text></TouchableOpacity><TouchableOpacity onPress={() => onChangeLocale('zh')} style={[styles.toggleButton, currentLocale.startsWith('zh') && styles.toggleButtonActive]}><Text style={styles.toggleButtonText}>ZH</Text></TouchableOpacity></View></View>
            </ScrollView>
        </SafeAreaView>
    </View>
);

// --- Main Menu Screen ---
export default function MenuScreen({ savedCities, onClose, onCitySelect, onAddCity, onDeleteCity, onChangeLocale, currentLocale, onChangeUnits, currentUnits }: { savedCities: City[]; onClose: () => void; onCitySelect: (id: string) => void; onAddCity: (id: string) => void; onDeleteCity: (id: string) => void; onChangeLocale: (l: string) => void; currentLocale: string; onChangeUnits: (u: UnitSystem) => void; currentUnits: UnitSystem; }) {
    const [searchInput, setSearchInput] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isSettingsVisible, setSettingsVisible] = useState(false);
    const API_KEY = "92039782b40df7e3e22ad777f7167e91";

    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 3) { setSuggestions([]); return; }
        try {
            const encodedQuery = encodeURIComponent(query);
            const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodedQuery}&limit=5&appid=${API_KEY}`;
            const response = await fetch(url);
            const data: any[] = await response.json();
            if (data) {
                const map = new Map<string, Suggestion>();
                data.forEach(item => {
                    const key = `${item.name},${item.country}`;
                    if (!map.has(key)) map.set(key, { name: item.name, country: item.country, state: item.state });
                });
                setSuggestions(Array.from(map.values()));
            }
        } catch (e) { console.error(e); setSuggestions([]); }
    }, []);
    useEffect(() => { if (searchInput.trim().length > 2) { const timer = setTimeout(() => fetchSuggestions(searchInput), 300); return () => clearTimeout(timer); } else { setSuggestions([]); } }, [searchInput, fetchSuggestions]);

    const handleSelectSuggestion = (city: Suggestion) => {
        const cityIdentifier = `${city.name}, ${city.country}`;
        const existingCity = savedCities.find(c => c.id.toLowerCase() === cityIdentifier.toLowerCase());

        if (existingCity) {
            onCitySelect(existingCity.id);
        } else {
            onAddCity(cityIdentifier);
        }
        setSearchInput('');
        setSuggestions([]);
    };

    return (
        <View style={styles.menuContainer}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}><Text style={styles.headerTitle}>{i18n.t('manageCities')}</Text><View style={styles.headerButtons}><TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.closeButton}><MoreVertical size={24} color="white" /></TouchableOpacity><TouchableOpacity onPress={onClose} style={styles.closeButton}><X size={28} color="white" /></TouchableOpacity></View></View>
                <View style={styles.searchSection}>
                    <TextInput placeholder={i18n.t('searchPlaceholder')} placeholderTextColor="rgba(255, 255, 255, 0.7)" style={styles.searchInput} value={searchInput} onChangeText={setSearchInput} />
                    {suggestions.length > 0 && (<View style={styles.suggestionsContainer}>{suggestions.map((item) => (<TouchableOpacity key={`${item.name}-${item.country}`} onPress={() => handleSelectSuggestion(item)} style={styles.suggestionItem}><MapPin size={16} color="white" /><Text style={styles.suggestionText}>{item.name}, {item.country}</Text></TouchableOpacity>))}</View>)}
                </View>
                <FlatList
                    data={savedCities}
                    renderItem={({ item }) => <CityListItem city={item} onSelect={() => onCitySelect(item.id)} onDelete={() => onDeleteCity(item.id)} />}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                />
            </SafeAreaView>
            <Modal visible={isSettingsVisible} animationType="slide"><SettingsScreen onClose={() => setSettingsVisible(false)} onChangeLocale={onChangeLocale} currentLocale={currentLocale} onChangeUnits={onChangeUnits} currentUnits={currentUnits} /></Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    menuContainer: { flex: 1, backgroundColor: '#1e293b' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    headerButtons: { flexDirection: 'row', alignItems: 'center' },
    closeButton: { padding: 8 },
    searchSection: { padding: 16, zIndex: 10 },
    searchInput: { backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', fontSize: 18, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
    suggestionsContainer: { backgroundColor: '#334155', borderRadius: 12, marginTop: 8 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#475569' },
    suggestionText: { color: 'white', fontSize: 16, marginLeft: 12 },
    cityItemContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, marginBottom: 12 },
    cityItem: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    deleteButton: { padding: 20, borderLeftWidth: 1, borderLeftColor: 'rgba(255, 255, 255, 0.2)' },
    cityName: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    localTime: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 16 },
    cityWeatherInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cityTemp: { color: 'white', fontSize: 28, fontWeight: '300' },
    scrollViewPadding: { padding: 16 },
    settingGroup: { marginBottom: 24 },
    settingLabel: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 18, marginBottom: 8 },
    toggleGroup: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 999, padding: 4 },
    toggleButton: { paddingVertical: 12, borderRadius: 999, flex: 1, alignItems: 'center' },
    toggleButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
    toggleButtonText: { color: 'white', fontWeight: 'bold' },
});
