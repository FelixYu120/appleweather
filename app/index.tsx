import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, View, TextInput, ScrollView, SafeAreaView, ActivityIndicator, StyleSheet, StatusBar, ColorValue, LayoutAnimation, UIManager, Platform, FlatList, Dimensions, TouchableOpacity, Alert, ViewToken, Keyboard, Modal } from 'react-native';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Thermometer, CloudDrizzle, CloudLightning, LucideProps, Sunrise, Sunset, Eye, PlusCircle, MapPin, List, X, Trash2, MoreVertical } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from '../lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Type Definitions ---
type UnitSystem = 'imperial' | 'metric';
interface WeatherIconProps { condition: string; size?: number; }
interface ForecastItem { dt: number; temp: number | { min: number; max: number }; weather: { main: string; description: string }[]; }
interface HourlyForecastProps { item: ForecastItem; isNow: boolean; }
interface DailyForecastProps { item: ForecastItem; }
interface InfoCardProps { icon: React.ElementType<LucideProps>; title: string; value: string | number; }
interface WeatherData { name: string; current: { dt: number; sunrise: number; sunset: number; temp: number; feels_like: number; humidity: number; uvi: number; visibility: number; wind_speed: number; weather: { main: string; description: string }[]; }; hourly: ForecastItem[]; daily: ForecastItem[]; }
interface Suggestion { name: string; country: string; state?: string; }

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
const HourlyForecastItem: React.FC<HourlyForecastProps> = ({ item, isNow }) => (
    <View className="items-center justify-center space-y-2 w-20"><Text className="text-white font-medium text-base">{isNow ? i18n.t('now') : new Date(item.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true })}</Text><WeatherIcon condition={item.weather[0].main} size={28} /><Text className="text-white font-bold text-xl">{typeof item.temp === 'number' ? Math.round(item.temp) : 0}°</Text></View>
);
const DailyForecastItem: React.FC<DailyForecastProps> = ({ item }) => (
    <View className="flex-row items-center justify-between py-3"><Text className="text-white font-medium text-lg w-1/3">{new Date(item.dt * 1000).toLocaleDateString(i18n.locale, { weekday: 'long' })}</Text><View className="w-8 h-8 items-center justify-center"><WeatherIcon condition={item.weather[0].main} size={28} /></View><View className="flex-row justify-end items-center space-x-2 w-1/2"><Text className="text-white/70 w-10 text-right text-lg">{typeof item.temp === 'object' ? Math.round(item.temp.min) : 0}°</Text><View className="w-full h-1 bg-white/20 rounded-full flex-1"><View className="h-1 rounded-full" style={{ backgroundColor: '#81c7f5', width: `${typeof item.temp === 'object' ? Math.max(0, Math.min(100, ((item.temp.max - item.temp.min) / 30) * 100)) : 0}%` }} /></View><Text className="text-white w-10 text-right text-lg font-bold">{typeof item.temp === 'object' ? Math.round(item.temp.max) : 0}°</Text></View></View>
);
const InfoCard: React.FC<InfoCardProps> = ({ icon, title, value }) => {
    const Icon = icon;
    return (<View style={styles.glassEffect} className="p-4 rounded-2xl flex-1"><View className="flex-row items-center space-x-2 mb-1"><Icon size={16} color="rgba(255, 255, 255, 0.7)" /><Text className="text-white/70 text-sm uppercase font-bold tracking-wider">{title}</Text></View><Text className="text-white text-3xl font-light">{value}</Text></View>);
};

// --- Weather Screen Component ---
const WeatherScreen = ({ city, lang, units }: { city: string, lang: string, units: UnitSystem }) => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
    const API_KEY = "92039782b40df7e3e22ad777f7167e91";

    const fetchWeather = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
            const geoResponse = await fetch(geoUrl);
            const geoData = await geoResponse.json();
            if (!geoResponse.ok || geoData.length === 0) throw new Error(i18n.t('errorCityNotFound', { city }));
            const { lat, lon, name, local_names } = geoData[0];
            const langCode = lang.split('-')[0];
            const displayName = local_names?.[langCode] || name;
            const apiLang = langCode === 'zh' ? 'zh_cn' : langCode;
            const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=${units}&exclude=minutely,alerts&appid=${API_KEY}&lang=${apiLang}`;
            const weatherResponse = await fetch(weatherUrl);
            if (!weatherResponse.ok) throw new Error(i18n.t('errorApiKey'));
            const fetchedWeatherData = await weatherResponse.json();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setWeatherData({ ...fetchedWeatherData, name: displayName });
        } catch (err) {
            setError(err instanceof Error ? err.message : i18n.t('errorDefault'));
        } finally {
            setLoading(false);
        }
    }, [city, lang, units]);

    useEffect(() => { fetchWeather() }, [fetchWeather]);

    let bgColors: readonly ColorValue[] = ['#4c669f', '#3b5998', '#192f6a'];
    if (weatherData?.current) {
        const { main } = weatherData.current.weather[0];
        const isDay = weatherData.current.dt > weatherData.current.sunrise && weatherData.current.dt < weatherData.current.sunset;
        if (main.includes('Clear')) bgColors = isDay ? ['#4a90e2', '#81c7f5'] : ['#0c1445', '#3b5998'];
        else if (main.includes('Clouds')) bgColors = isDay ? ['#6c7a89', '#95a5a6'] : ['#2c3e50', '#34495e'];
        else if (main.includes('Rain') || main.includes('Drizzle')) bgColors = ['#546e7a', '#37474f'];
        else if (main.includes('Snow')) bgColors = ['#b0c4de', '#a4b0be'];
    }

    return (
        <LinearGradient colors={bgColors as [ColorValue, ColorValue]} style={{ width: Dimensions.get('window').width, flex: 1 }}>
            <View style={styles.fullScreen}>
                {loading && <View style={styles.centered}><ActivityIndicator size="large" color="white" /></View>}
                {error && <View style={styles.centered}><Text className="text-white text-center text-lg p-4">{error}</Text></View>}
                {weatherData && (
                    <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 80 }} className="p-5">
                        <View className="items-center my-6"><Text style={styles.textShadow} className="text-white text-4xl font-medium">{weatherData.name}</Text><Text style={styles.textShadow} className="text-white text-9xl font-thin">{Math.round(weatherData.current.temp)}°</Text><Text style={styles.textShadow} className="text-white text-2xl capitalize">{weatherData.current.weather[0].description}</Text><Text style={styles.textShadow} className="text-white text-xl">H:{typeof weatherData.daily[0].temp === 'object' ? Math.round(weatherData.daily[0].temp.max) : ''}° L:{typeof weatherData.daily[0].temp === 'object' ? Math.round(weatherData.daily[0].temp.min) : ''}°</Text></View>
                        <View style={styles.glassEffect} className="p-4 rounded-2xl mb-5"><Text className="text-white/70 text-sm uppercase font-bold mb-2 border-b border-white/20 pb-2 tracking-wider">{i18n.t('hourlyForecast')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{weatherData.hourly.slice(0, 24).map((item, index) => (<HourlyForecastItem key={item.dt} item={item} isNow={index === 0} />))}</ScrollView></View>
                        <View style={styles.glassEffect} className="p-4 rounded-2xl mb-5"><Text className="text-white/70 text-sm uppercase font-bold mb-2 border-b border-white/20 pb-2 tracking-wider">{i18n.t('dailyForecast')}</Text>{weatherData.daily.slice(1, 8).map((item) => (<DailyForecastItem key={item.dt} item={item} />))}</View>
                        <View className="flex-row w-full space-x-4 mb-4"><InfoCard icon={Sunrise} title={i18n.t('sunrise')} value={new Date(weatherData.current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} /><InfoCard icon={Sunset} title={i18n.t('sunset')} value={new Date(weatherData.current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} /></View>
                        <View className="flex-row w-full space-x-4 mb-4"><InfoCard icon={Droplets} title={i18n.t('humidity')} value={`${weatherData.current.humidity}%`} /><InfoCard icon={Thermometer} title={i18n.t('feelsLike')} value={`${Math.round(weatherData.current.feels_like)}°`} /></View>
                        <View className="flex-row w-full space-x-4 mb-4"><InfoCard icon={Wind} title={i18n.t('wind')} value={`${Math.round(weatherData.current.wind_speed)} ${units === 'imperial' ? 'mph' : 'm/s'}`} /><InfoCard icon={Eye} title={i18n.t('visibility')} value={`${(weatherData.current.visibility / (units === 'imperial' ? 1609 : 1000)).toFixed(1)} ${units === 'imperial' ? 'mi' : 'km'}`} /></View>
                        <View className="flex-row w-full space-x-4"><InfoCard icon={Sun} title={i18n.t('uvIndex')} value={weatherData.current.uvi} /></View>
                    </ScrollView>
                )}
            </View>
        </LinearGradient>
    );
};

// --- Add City Preview Modal ---
const AddCityPreview = ({ city, units, onClose, onAdd }: { city: Suggestion; units: UnitSystem; onClose: () => void; onAdd: (city: string) => void; }) => {
    const [previewData, setPreviewData] = useState<any>(null);
    useEffect(() => {
        const fetchPreview = async () => {
            const API_KEY = "92039782b40df7e3e22ad777f7167e91";
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city.name}&units=${units}&appid=${API_KEY}`;
            try { const res = await fetch(url); const data = await res.json(); setPreviewData(data); } catch (e) { console.error(e); }
        };
        fetchPreview();
    }, [city, units]);

    return (
        <View style={styles.previewContainer}>
            <View style={styles.previewBox}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}><X size={24} color="white" /></TouchableOpacity>
                {previewData ? (
                    <>
                        <Text className="text-white text-3xl font-bold">{previewData.name}</Text>
                        <Text className="text-white text-7xl font-thin">{Math.round(previewData.main.temp)}°</Text>
                        <Text className="text-white text-xl capitalize">{previewData.weather[0].description}</Text>
                        <TouchableOpacity onPress={() => onAdd(city.name)} style={styles.addButton}><Text className="text-blue-500 font-bold text-lg">{i18n.t('add')}</Text></TouchableOpacity>
                    </>
                ) : <ActivityIndicator color="white" />}
            </View>
        </View>
    );
};

// --- Settings Screen ---
const SettingsScreen = ({ onClose, onChangeLocale, currentLocale, onChangeUnits, currentUnits }: { onClose: () => void; onChangeLocale: (l: string) => void; currentLocale: string; onChangeUnits: (u: UnitSystem) => void; currentUnits: UnitSystem; }) => (
    <View style={styles.menuContainer}>
        <SafeAreaView style={{ flex: 1 }}>
            <View className="flex-row justify-between items-center p-4 border-b border-slate-600"><Text className="text-white text-2xl font-bold">{i18n.t('settings')}</Text><TouchableOpacity onPress={onClose} className="p-2"><X size={28} color="white" /></TouchableOpacity></View>
            <ScrollView className="p-4">
                <View className="mb-6"><Text className="text-white/70 text-lg mb-2">{i18n.t('temperature')}</Text><View className="flex-row bg-black/20 rounded-full p-1 justify-around"><TouchableOpacity onPress={() => onChangeUnits('imperial')} className={`p-2 rounded-full flex-1 items-center ${currentUnits === 'imperial' ? 'bg-white/30' : ''}`}><Text className="text-white font-bold">{i18n.t('fahrenheit')}</Text></TouchableOpacity><TouchableOpacity onPress={() => onChangeUnits('metric')} className={`p-2 rounded-full flex-1 items-center ${currentUnits === 'metric' ? 'bg-white/30' : ''}`}><Text className="text-white font-bold">{i18n.t('celsius')}</Text></TouchableOpacity></View></View>
                <View className="mb-6"><Text className="text-white/70 text-lg mb-2">{i18n.t('language')}</Text><View className="flex-row bg-black/20 rounded-full p-1 justify-around"><TouchableOpacity onPress={() => onChangeLocale('en')} className={`p-2 rounded-full flex-1 items-center ${currentLocale.startsWith('en') ? 'bg-white/30' : ''}`}><Text className="text-white font-bold">EN</Text></TouchableOpacity><TouchableOpacity onPress={() => onChangeLocale('es')} className={`p-2 rounded-full flex-1 items-center ${currentLocale.startsWith('es') ? 'bg-white/30' : ''}`}><Text className="text-white font-bold">ES</Text></TouchableOpacity><TouchableOpacity onPress={() => onChangeLocale('zh')} className={`p-2 rounded-full flex-1 items-center ${currentLocale.startsWith('zh') ? 'bg-white/30' : ''}`}><Text className="text-white font-bold">ZH</Text></TouchableOpacity></View></View>
            </ScrollView>
        </SafeAreaView>
    </View>
);

// --- Manage Cities Screen ---
const ManageCitiesScreen = ({ cities, onAddCity, onDeleteCity, onClose, onChangeLocale, currentLocale, onChangeUnits, currentUnits }: { cities: string[]; onAddCity: (c: string) => void; onDeleteCity: (i: number) => void; onClose: () => void; onChangeLocale: (l: string) => void; currentLocale: string; onChangeUnits: (u: UnitSystem) => void; currentUnits: UnitSystem; }) => {
    const [searchInput, setSearchInput] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isSettingsVisible, setSettingsVisible] = useState(false);
    const [previewCity, setPreviewCity] = useState<Suggestion | null>(null);
    const API_KEY = "92039782b40df7e3e22ad777f7167e91";

    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 3) { setSuggestions([]); return; }
        try { const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`; const response = await fetch(url); const data: any[] = await response.json(); if (data) { const map = new Map<string, Suggestion>(); data.forEach(item => { const key = `${item.name},${item.country}`; if (!map.has(key)) map.set(key, { name: item.name, country: item.country, state: item.state }); }); setSuggestions(Array.from(map.values())); } } catch (e) { console.error(e); setSuggestions([]); }
    }, []);
    useEffect(() => { if (searchInput.trim().length > 2) { const timer = setTimeout(() => fetchSuggestions(searchInput), 300); return () => clearTimeout(timer); } else { setSuggestions([]); } }, [searchInput, fetchSuggestions]);

    const handleAddCity = (city: string) => { onAddCity(city); setPreviewCity(null); };

    return (
        <View style={styles.menuContainer}>
            <SafeAreaView style={{ flex: 1 }}>
                <View className="flex-row justify-between items-center p-4 border-b border-slate-600"><Text className="text-white text-2xl font-bold">{i18n.t('manageCities')}</Text><View className="flex-row items-center"><TouchableOpacity onPress={() => setSettingsVisible(true)} className="p-2"><MoreVertical size={24} color="white" /></TouchableOpacity><TouchableOpacity onPress={onClose} className="p-2 ml-2"><X size={28} color="white" /></TouchableOpacity></View></View>
                <ScrollView className="p-4">
                    <View className="mb-6"><Text className="text-white/70 text-lg mb-2">{i18n.t('addCity')}</Text><View className="flex-row flex-1 items-center bg-black/20 rounded-full"><TextInput placeholder={i18n.t('searchPlaceholder')} placeholderTextColor="rgba(255, 255, 255, 0.7)" className="text-white text-lg px-5 py-3 flex-1" value={searchInput} onChangeText={setSearchInput} /></View>
                        {suggestions.length > 0 && (<View className="bg-slate-700 rounded-lg mt-2">{suggestions.map((item, index) => (<TouchableOpacity key={`${item.name}-${item.country}-${index}`} onPress={() => setPreviewCity(item)} className="flex-row items-center p-3 border-b border-slate-600"><MapPin size={16} color="white" /><Text className="text-white text-lg ml-3">{item.name}, {item.country}</Text></TouchableOpacity>))}</View>)}
                    </View>
                    <View className="mb-6"><Text className="text-white/70 text-lg mb-2">{i18n.t('myCities')}</Text>{cities.map((city, index) => (<View key={city} className="flex-row items-center justify-between bg-black/20 p-4 rounded-lg mb-2"><Text className="text-white text-xl">{city}</Text><TouchableOpacity onPress={() => onDeleteCity(index)}><Trash2 size={24} color="#ff4757" /></TouchableOpacity></View>))}</View>
                </ScrollView>
            </SafeAreaView>
            <Modal transparent visible={!!previewCity} animationType="fade"><AddCityPreview city={previewCity!} units={currentUnits} onClose={() => setPreviewCity(null)} onAdd={handleAddCity} /></Modal>
            <Modal visible={isSettingsVisible} animationType="slide"><SettingsScreen onClose={() => setSettingsVisible(false)} onChangeLocale={onChangeLocale} currentLocale={currentLocale} onChangeUnits={onChangeUnits} currentUnits={currentUnits} /></Modal>
        </View>
    );
};

// --- Main App Container ---
export default function Index() {
    const [cities, setCities] = useState<string[]>(['Irvine', 'London', 'Tokyo']);
    const [units, setUnits] = useState<UnitSystem>('imperial');
    const [_, setForceUpdate] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMenuVisible, setMenuVisible] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();

    const changeLocale = (locale: string) => { i18n.locale = locale; setForceUpdate(c => c + 1); };
    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => { if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0); }).current;
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const addCity = (city: string) => {
        const newCity = city.trim();
        if (newCity && !cities.find(c => c.toLowerCase() === newCity.toLowerCase())) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCities([...cities, newCity]);
            Keyboard.dismiss();
            setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); setMenuVisible(false); }, 500);
        } else if (newCity) { Alert.alert("City Exists", i18n.t('cityExists', { city: newCity })); }
    };
    const deleteCity = (indexToDelete: number) => {
        if (cities.length <= 1) { Alert.alert("Cannot Delete", "You must have at least one city."); return; }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCities(cities.filter((_, index) => index !== indexToDelete));
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <FlatList ref={flatListRef} data={cities} renderItem={({ item }) => <WeatherScreen city={item} lang={i18n.locale} units={units} />} keyExtractor={(item) => item} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={viewabilityConfig} />
            <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
                <View style={styles.paginationContainer}>{cities.map((_, index) => (<View key={index} style={[styles.dot, activeIndex === index ? styles.activeDot : styles.inactiveDot]} />))}</View>
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}><List size={28} color="white" /></TouchableOpacity>
            </View>
            <Modal animationType="slide" transparent={false} visible={isMenuVisible} onRequestClose={() => setMenuVisible(false)}><ManageCitiesScreen cities={cities} onAddCity={addCity} onDeleteCity={deleteCity} onClose={() => setMenuVisible(false)} onChangeLocale={changeLocale} currentLocale={i18n.locale} onChangeUnits={setUnits} currentUnits={units} /></Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#192f6a' },
    fullScreen: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    textShadow: { textShadowColor: 'rgba(0, 0, 0, 0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    glassEffect: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, height: 50, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255, 255, 255, 0.2)' },
    paginationContainer: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
    activeDot: { width: 20, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
    inactiveDot: { width: 8, backgroundColor: 'rgba(255, 255, 255, 0.4)' },
    menuButton: { position: 'absolute', right: 20, top: 11 },
    menuContainer: { flex: 1, backgroundColor: '#1e293b' },
    previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    previewBox: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, alignItems: 'center', width: '80%' },
    closeButton: { position: 'absolute', top: 10, right: 10, padding: 5 },
    addButton: { backgroundColor: 'white', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 30, marginTop: 20 }
});
