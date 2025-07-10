import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Text, View, ScrollView, ActivityIndicator, StyleSheet, ColorValue, LayoutAnimation, UIManager, Platform, FlatList, Dimensions, TouchableOpacity, ViewToken } from 'react-native';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Thermometer, CloudDrizzle, CloudLightning, LucideProps, Sunrise, Sunset, Eye, List } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from '../../lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Type Definitions ---
type UnitSystem = 'imperial' | 'metric';
interface City {
    id: string;
    name: string;
}
interface WeatherIconProps { condition: string; size?: number; }
interface ForecastItem { dt: number; temp: number | { min: number; max: number }; weather: { main: string; description: string }[]; }
interface HourlyForecastProps { item: ForecastItem; isNow: boolean; }
interface DailyForecastProps { item: ForecastItem; }
interface InfoCardProps { icon: React.ElementType<LucideProps>; title: string; value: string | number; }
interface WeatherData { name: string; country: string; current: { dt: number; sunrise: number; sunset: number; temp: number; feels_like: number; humidity: number; uvi: number; visibility: number; wind_speed: number; weather: { main: string; description: string }[]; }; hourly: ForecastItem[]; daily: ForecastItem[]; }

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
    <View style={styles.hourlyItem}><Text style={styles.hourlyTime}>{isNow ? i18n.t('now') : new Date(item.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true })}</Text><WeatherIcon condition={item.weather[0].main} size={28} /><Text style={styles.hourlyTemp}>{typeof item.temp === 'number' ? Math.round(item.temp) : 0}°</Text></View>
);
const DailyForecastItem: React.FC<DailyForecastProps> = ({ item }) => (
    <View style={styles.dailyItem}><Text style={styles.dailyDay}>{new Date(item.dt * 1000).toLocaleDateString(i18n.locale, { weekday: 'long' })}</Text><View style={styles.dailyIcon}><WeatherIcon condition={item.weather[0].main} size={28} /></View><View style={styles.dailyTempContainer}><Text style={styles.dailyTempMin}>{typeof item.temp === 'object' ? Math.round(item.temp.min) : 0}°</Text><View style={styles.dailyTempBarContainer}><View style={[styles.dailyTempBar, { width: `${typeof item.temp === 'object' ? Math.max(0, Math.min(100, ((item.temp.max - item.temp.min) / 30) * 100)) : 0}%` }]} /></View><Text style={styles.dailyTempMax}>{typeof item.temp === 'object' ? Math.round(item.temp.max) : 0}°</Text></View></View>
);
const InfoCard: React.FC<InfoCardProps> = ({ icon, title, value }) => {
    const Icon = icon;
    return (<View style={styles.infoCard}><View style={styles.infoCardHeader}><Icon size={16} color="rgba(255, 255, 255, 0.7)" /><Text style={styles.infoCardTitle}>{title}</Text></View><Text style={styles.infoCardValue}>{value}</Text></View>);
};

// --- Weather Screen Component (for a single city) ---
const WeatherPage = ({ city, lang, units }: { city: City, lang: string, units: UnitSystem }) => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
    const API_KEY = "92039782b40df7e3e22ad777f7167e91";

    const fetchWeather = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city.name}&limit=1&appid=${API_KEY}`;
            const geoResponse = await fetch(geoUrl);
            const geoData = await geoResponse.json();
            if (!geoResponse.ok || geoData.length === 0) throw new Error(i18n.t('errorCityNotFound', { city: city.name }));
            const { lat, lon, name, country, local_names } = geoData[0];
            const langCode = lang.split('-')[0];
            const displayName = local_names?.[langCode] || name;
            const apiLang = langCode === 'zh' ? 'zh_cn' : langCode;
            const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=${units}&exclude=minutely,alerts&appid=${API_KEY}&lang=${apiLang}`;
            const weatherResponse = await fetch(weatherUrl);
            if (!weatherResponse.ok) throw new Error(i18n.t('errorApiKey'));
            const fetchedWeatherData = await weatherResponse.json();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setWeatherData({ ...fetchedWeatherData, name: displayName, country });
        } catch (err) {
            setError(err instanceof Error ? err.message : i18n.t('errorDefault'));
        } finally {
            setLoading(false);
        }
    }, [city, lang, units]);

    useEffect(() => {
        fetchWeather().catch(console.error);
    }, [fetchWeather]);

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
                {error && <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>}
                {weatherData && (
                    <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 80 }} style={styles.scrollView}>
                        <View style={styles.mainInfoContainer}><Text style={[styles.textShadow, styles.cityName]}>{weatherData.name}</Text><Text style={[styles.textShadow, styles.countryName]}>{weatherData.country}</Text><Text style={[styles.textShadow, styles.mainTemp]}>{Math.round(weatherData.current.temp)}°</Text><Text style={[styles.textShadow, styles.weatherDescription]}>{weatherData.current.weather[0].description}</Text><Text style={[styles.textShadow, styles.highLowTemp]}>H:{typeof weatherData.daily[0].temp === 'object' ? Math.round(weatherData.daily[0].temp.max) : ''}° L:{typeof weatherData.daily[0].temp === 'object' ? Math.round(weatherData.daily[0].temp.min) : ''}°</Text></View>
                        <View style={styles.glassEffect}><Text style={styles.forecastHeader}>{i18n.t('hourlyForecast')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{weatherData.hourly.slice(0, 24).map((item, index) => (<HourlyForecastItem key={item.dt} item={item} isNow={index === 0} />))}</ScrollView></View>
                        <View style={styles.glassEffect}><Text style={styles.forecastHeader}>{i18n.t('dailyForecast')}</Text>{weatherData.daily.slice(1, 8).map((item) => (<DailyForecastItem key={item.dt} item={item} />))}</View>
                        <View style={styles.infoGrid}><InfoCard icon={Sunrise} title={i18n.t('sunrise')} value={new Date(weatherData.current.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} /><InfoCard icon={Sunset} title={i18n.t('sunset')} value={new Date(weatherData.current.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} /></View>
                        <View style={styles.infoGrid}><InfoCard icon={Droplets} title={i18n.t('humidity')} value={`${weatherData.current.humidity}%`} /><InfoCard icon={Thermometer} title={i18n.t('feelsLike')} value={`${Math.round(weatherData.current.feels_like)}°`} /></View>
                        <View style={styles.infoGrid}><InfoCard icon={Wind} title={i18n.t('wind')} value={`${Math.round(weatherData.current.wind_speed)} ${units === 'imperial' ? 'mph' : 'm/s'}`} /><InfoCard icon={Eye} title={i18n.t('visibility')} value={`${(weatherData.current.visibility / (units === 'imperial' ? 1609 : 1000)).toFixed(1)} ${units === 'imperial' ? 'mi' : 'km'}`} /></View>
                        <View style={styles.infoGrid}><InfoCard icon={Sun} title={i18n.t('uvIndex')} value={weatherData.current.uvi} /></View>
                    </ScrollView>
                )}
            </View>
        </LinearGradient>
    );
};

// --- Main Swiper Component ---
interface WeatherSwiperProps {
    cities: City[];
    onMenuPress: () => void;
    units: UnitSystem;
    lang: string;
    flatListRef?: React.RefObject<FlatList<any> | null>;}

export default function WeatherSwiper({ cities, onMenuPress, units, lang, flatListRef }: WeatherSwiperProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const insets = useSafeAreaInsets();

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index ?? 0);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={cities}
                renderItem={({ item }) => <WeatherPage city={item} lang={lang} units={units} />}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                extraData={{lang, units}}
            />
            <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
                <View style={styles.paginationContainer}>
                    {cities.map((city, index) => (
                        <View key={city.id} style={[styles.dot, activeIndex === index ? styles.activeDot : styles.inactiveDot]} />
                    ))}
                </View>
                <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
                    <List size={28} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    fullScreen: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: 'white', textAlign: 'center', fontSize: 18, padding: 16 },
    scrollView: { paddingHorizontal: 20 },
    mainInfoContainer: { alignItems: 'center', marginVertical: 24 },
    textShadow: { textShadowColor: 'rgba(0, 0, 0, 0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    cityName: { color: 'white', fontSize: 36, fontWeight: '400' },
    countryName: { color: 'white', fontSize: 18, fontWeight: '300' },
    mainTemp: { color: 'white', fontSize: 96, fontWeight: '200', marginVertical: -8 },
    weatherDescription: { color: 'white', fontSize: 22, textTransform: 'capitalize', marginTop: -4 },
    highLowTemp: { color: 'white', fontSize: 20 },
    glassEffect: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', padding: 16, marginBottom: 20 },
    forecastHeader: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.2)', paddingBottom: 8, letterSpacing: 0.5 },
    hourlyItem: { alignItems: 'center', justifyContent: 'center', gap: 8, width: 80 },
    hourlyTime: { color: 'white', fontWeight: '500', fontSize: 16 },
    hourlyTemp: { color: 'white', fontWeight: '700', fontSize: 20 },
    dailyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    dailyDay: { color: 'white', fontWeight: '500', fontSize: 18, width: '33%' },
    dailyIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    dailyTempContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, width: '50%' },
    dailyTempMin: { color: 'rgba(255, 255, 255, 0.7)', width: 40, textAlign: 'right', fontSize: 18 },
    dailyTempBarContainer: { flex: 1, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2 },
    dailyTempBar: { height: 4, backgroundColor: '#81c7f5', borderRadius: 2 },
    dailyTempMax: { color: 'white', width: 40, textAlign: 'right', fontSize: 18, fontWeight: '700' },
    infoGrid: { flexDirection: 'row', width: '100%', gap: 16, marginBottom: 16 },
    infoCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: 16, borderRadius: 16, flex: 1 },
    infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    infoCardTitle: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
    infoCardValue: { color: 'white', fontSize: 36, fontWeight: '300' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, height: 50, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255, 255, 255, 0.2)' },
    paginationContainer: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
    activeDot: { width: 20, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
    inactiveDot: { width: 8, backgroundColor: 'rgba(255, 255, 255, 0.4)' },
    menuButton: { position: 'absolute', right: 20, top: 11 },
});
