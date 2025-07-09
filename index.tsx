import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, View, TextInput, ScrollView, SafeAreaView, ActivityIndicator, StyleSheet, StatusBar, ColorValue, LayoutAnimation, UIManager, Platform, FlatList, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Thermometer, CloudDrizzle, CloudLightning, LucideProps, Sunrise, Sunset, Eye, Languages, PlusCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from '../lib/i18n'; // Import our i18n setup

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- TypeScript Interfaces ---
interface WeatherIconProps {
    condition: string;
    size?: number;
}
interface ForecastItem {
    dt: number;
    temp: number | { min: number; max: number };
    weather: { main: string; description: string }[];
}
interface HourlyForecastProps {
    item: ForecastItem;
    isNow: boolean;
}
interface DailyForecastProps {
    item: ForecastItem;
}
interface InfoCardProps {
    icon: React.ElementType<LucideProps>;
    title: string;
    value: string | number;
}
interface WeatherData {
    name: string;
    current: {
        dt: number;
        sunrise: number;
        sunset: number;
        temp: number;
        feels_like: number;
        humidity: number;
        uvi: number;
        visibility: number;
        wind_speed: number;
        weather: { main: string; description: string }[];
    };
    hourly: ForecastItem[];
    daily: ForecastItem[];
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
const HourlyForecastItem: React.FC<HourlyForecastProps> = ({ item, isNow }) => (
    <View className="flex flex-col items-center justify-center space-y-2 w-20">
        <Text className="text-white font-medium text-base">{isNow ? i18n.t('now') : new Date(item.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true })}</Text>
        <WeatherIcon condition={item.weather[0].main} size={28} />
        <Text className="text-white font-bold text-xl">{typeof item.temp === 'number' ? Math.round(item.temp) : 0}°</Text>
    </View>
);
const DailyForecastItem: React.FC<DailyForecastProps> = ({ item }) => (
    <View className="flex-row items-center justify-between py-3">
        <Text className="text-white font-medium text-lg w-1/3">{new Date(item.dt * 1000).toLocaleDateString(i18n.locale, { weekday: 'long' })}</Text>
        <View className="w-8 h-8 flex items-center justify-center"><WeatherIcon condition={item.weather[0].main} size={28} /></View>
        <View className="flex-row justify-end items-center space-x-2 w-1/2">
            <Text className="text-white/70 w-10 text-right text-lg">{typeof item.temp === 'object' ? Math.round(item.temp.min) : 0}°</Text>
            <View className="w-full h-1 bg-white/20 rounded-full flex-1"><View className="h-1 rounded-full" style={{ backgroundColor: '#81c7f5', width: `${typeof item.temp === 'object' ? Math.max(0, Math.min(100, ((item.temp.max - item.temp.min) / 30) * 100)) : 0}%` }} /></View>
            <Text className="text-white w-10 text-right text-lg font-bold">{typeof item.temp === 'object' ? Math.round(item.temp.max) : 0}°</Text>
        </View>
    </View>
);
const InfoCard: React.FC<InfoCardProps> = ({ icon, title, value }) => {
    const Icon = icon;
    return (
        <View style={styles.glassEffect} className="p-4 rounded-2xl flex-1">
            <View className="flex-row items-center space-x-2 mb-1"><Icon size={16} color="rgba(255, 255, 255, 0.7)" /><Text className="text-white/70 text-sm uppercase font-bold tracking-wider">{title}</Text></View>
            <Text className="text-white text-3xl font-light">{value}</Text>
        </View>
    );
};

// --- Weather Screen Component ---
const WeatherScreen = ({ city, lang }: { city: string, lang: string }) => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_KEY = "92039782b40df7e3e22ad777f7167e91";

    const fetchWeather = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
            const geoResponse = await fetch(geoUrl);
            const geoData = await geoResponse.json();
            if (!geoResponse.ok || geoData.length === 0) throw new Error(i18n.t('errorCityNotFound', { city }));

            const { lat, lon, name } = geoData[0];
            // Use zh_cn for Chinese API results
            const apiLang = lang.startsWith('zh') ? 'zh_cn' : lang;
            const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=imperial&exclude=minutely,alerts&appid=${API_KEY}&lang=${apiLang}`;
            const weatherResponse = await fetch(weatherUrl);
            if (!weatherResponse.ok) throw new Error(i18n.t('errorApiKey'));

            const fetchedWeatherData = await weatherResponse.json();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setWeatherData({ ...fetchedWeatherData, name });
        } catch (err) {
            setError(err instanceof Error ? err.message : i18n.t('errorDefault'));
        } finally {
            setLoading(false);
        }
    }, [city, lang]);

    useEffect(() => {
        fetchWeather();
    }, [fetchWeather]);

    let bgColors: readonly ColorValue[] = ['#4c669f', '#3b5998', '#192f6a'];
    if (weatherData && weatherData.current) {
        const condition = weatherData.current.weather[0].main;
        const isDay = weatherData.current.dt > weatherData.current.sunrise && weatherData.current.dt < weatherData.current.sunset;
        if (condition.includes('Clear')) bgColors = isDay ? ['#4a90e2', '#81c7f5'] : ['#0c1445', '#3b5998'];
        else if (condition.includes('Clouds')) bgColors = isDay ? ['#6c7a89', '#95a5a6'] : ['#2c3e50', '#34495e'];
        else if (condition.includes('Rain') || condition.includes('Drizzle')) bgColors = ['#546e7a', '#37474f'];
        else if (condition.includes('Snow')) bgColors = ['#b0c4de', '#a4b0be'];
    }

    return (
        <LinearGradient colors={bgColors as [ColorValue, ColorValue]} style={{ width: Dimensions.get('window').width }}>
            <SafeAreaView style={styles.fullScreen}>
                {loading && <ActivityIndicator size="large" color="white" />}
                {error && <Text className="text-white text-center text-lg mt-20 p-4">{error}</Text>}
                {weatherData && (
                    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="p-5">
                        <View className="items-center my-6">
                            <Text style={styles.textShadow} className="text-white text-4xl font-medium">{weatherData.name}</Text>
                            <Text style={styles.textShadow} className="text-white text-9xl font-thin">{Math.round(weatherData.current.temp)}°</Text>
                            <Text style={styles.textShadow} className="text-white text-2xl capitalize">{weatherData.current.weather[0].description}</Text>
                            <Text style={styles.textShadow} className="text-white text-xl">H:{typeof weatherData.daily[0].temp === 'object' ? Math.round(weatherData.daily[0].temp.max) : ''}° L:{typeof weatherData.daily[0].temp === 'object' ? Math.round(weatherData.daily[0].temp.min) : ''}°</Text>
                        </View>
                        <View style={styles.glassEffect} className="p-4 rounded-2xl mb-5">
                            <Text className="text-white/70 text-sm uppercase font-bold mb-2 border-b border-white/20 pb-2 tracking-wider">{i18n.t('hourlyForecast')}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>{weatherData.hourly.slice(0, 24).map((item, index) => (<HourlyForecastItem key={item.dt} item={item} isNow={index === 0} />))}</ScrollView>
                        </View>
                        <View style={styles.glassEffect} className="p-4 rounded-2xl mb-5">
                            <Text className="text-white/70 text-sm uppercase font-bold mb-2 border-b border-white/20 pb-2 tracking-wider">{i18n.t('dailyForecast')}</Text>
                            {weatherData.daily.slice(1, 8).map((item) => (<DailyForecastItem key={item.dt} item={item} />))}
                        </View>
                        <View className="flex-row w-full space-x-4 mb-4">
                            <InfoCard icon={Sunrise} title={i18n.t('sunrise')} value={new Date(weatherData.current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                            <InfoCard icon={Sunset} title={i18n.t('sunset')} value={new Date(weatherData.current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                        </View>
                        <View className="flex-row w-full space-x-4 mb-4">
                            <InfoCard icon={Droplets} title={i18n.t('humidity')} value={`${weatherData.current.humidity}%`} />
                            <InfoCard icon={Thermometer} title={i18n.t('feelsLike')} value={`${Math.round(weatherData.current.feels_like)}°`} />
                        </View>
                        <View className="flex-row w-full space-x-4">
                            <InfoCard icon={Wind} title={i18n.t('wind')} value={`${Math.round(weatherData.current.wind_speed)} mph`} />
                            <InfoCard icon={Eye} title={i18n.t('visibility')} value={`${(weatherData.current.visibility / 1609).toFixed(1)} mi`} />
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
};


// --- Main App Container ---
export default function Index() {
    const [cities, setCities] = useState<string[]>(['Irvine', 'London', 'Tokyo']);
    const [searchInput, setSearchInput] = useState('');
    const [locale, setLocale] = useState(i18n.locale);
    const flatListRef = useRef<FlatList>(null);

    i18n.locale = locale;

    const addCity = () => {
        const newCity = searchInput.trim();
        if (newCity && !cities.find(c => c.toLowerCase() === newCity.toLowerCase())) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCities([...cities, newCity]);
            setSearchInput('');
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 500);
        } else if (newCity) {
            Alert.alert("City Exists", i18n.t('cityExists', { city: newCity }));
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View className="p-4 pt-16 bg-slate-800 flex-row items-center justify-between">
                <View className="flex-row flex-1 items-center bg-black/20 rounded-full">
                    <TextInput
                        placeholder={i18n.t('searchPlaceholder')}
                        placeholderTextColor="rgba(255, 255, 255, 0.7)"
                        className="text-white text-lg px-5 py-2 flex-1"
                        value={searchInput}
                        onChangeText={setSearchInput}
                        onSubmitEditing={addCity}
                    />
                    <TouchableOpacity onPress={addCity} className="p-2">
                        <PlusCircle size={24} color="white" />
                    </TouchableOpacity>
                </View>
                {/* --- LANGUAGE TOGGLE --- */}
                <View className="flex-row ml-2">
                    <TouchableOpacity onPress={() => setLocale('en')} className={`p-2 rounded-full ${locale.startsWith('en') ? 'bg-white/30' : ''}`}>
                        <Text className="text-white font-bold">EN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setLocale('es')} className={`p-2 rounded-full ${locale.startsWith('es') ? 'bg-white/30' : ''}`}>
                        <Text className="text-white font-bold">ES</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setLocale('zh')} className={`p-2 rounded-full ${locale.startsWith('zh') ? 'bg-white/30' : ''}`}>
                        <Text className="text-white font-bold">ZH</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={cities}
                renderItem={({ item }) => <WeatherScreen city={item} lang={locale.split('-')[0]} />}
                keyExtractor={(item) => item}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#192f6a' },
    fullScreen: { flex: 1 },
    textShadow: { textShadowColor: 'rgba(0, 0, 0, 0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    glassEffect: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
});
