export interface WeatherData {
    current: {
        temperature: number
        weatherCode: number
        description: string
    }
    hourly: {
        time: string[]
        temperature_2m: number[]
        relativehumidity_2m: number[]
        windspeed_10m: number[]
        uv_index: number[]
    }
    daily: {
        time: string[]
        weathercode: number[]
        temperature_2m_max: number[]
        temperature_2m_min: number[]
    }
}

export interface AirQualityData {
    current: {
        us_aqi: number
        pm2_5: number
    }
    hourly: {
        time: string[]
        us_aqi: number[]
    }
}

export interface GeocodingResult {
    name: string
    latitude: number
    longitude: number
    country: string
}

// Map WMO weather codes to descriptions
export const getWeatherDescription = (code: number): string => {
    if (code === 0) return "Clear sky"
    if (code === 1 || code === 2 || code === 3) return "Mainly clear, partly cloudy, and overcast"
    if (code === 45 || code === 48) return "Fog and depositing rime fog"
    if (code === 51 || code === 53 || code === 55) return "Drizzle: Light, moderate, and dense intensity"
    if (code === 56 || code === 57) return "Freezing Drizzle: Light and dense intensity"
    if (code === 61 || code === 63 || code === 65) return "Rain: Slight, moderate and heavy intensity"
    if (code === 66 || code === 67) return "Freezing Rain: Light and heavy intensity"
    if (code === 71 || code === 73 || code === 75) return "Snow fall: Slight, moderate, and heavy intensity"
    if (code === 77) return "Snow grains"
    if (code === 80 || code === 81 || code === 82) return "Rain showers: Slight, moderate, and violent"
    if (code === 85 || code === 86) return "Snow showers slight and heavy"
    if (code === 95) return "Thunderstorm: Slight or moderate"
    if (code === 96 || code === 99) return "Thunderstorm with slight and heavy hail"
    return "Unknown"
}

export async function searchCity(query: string): Promise<GeocodingResult[]> {
    const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    )
    const data = await response.json()
    return data.results || []
}

export async function getAirQuality(lat: number, lon: number): Promise<AirQualityData> {
    const response = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5&hourly=us_aqi&timezone=auto`
    )
    const data = await response.json()
    return {
        current: {
            us_aqi: data.current.us_aqi,
            pm2_5: data.current.pm2_5
        },
        hourly: {
            time: data.hourly.time,
            us_aqi: data.hourly.us_aqi
        }
    }
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ name: string, country: string }> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        )
        const data = await response.json()

        // Extract city/town/village and country
        const name = data.address.city || data.address.town || data.address.village || data.address.hamlet || "Unknown Location"
        const country = data.address.country || ""

        return { name, country }
    } catch (error) {
        console.error("Reverse geocoding failed", error)
        return { name: "Unknown", country: "" }
    }
}

export async function getWeatherData(lat: number, lon: number): Promise<WeatherData> {
    const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
    )
    const data = await response.json()

    return {
        current: {
            temperature: data.current_weather.temperature,
            weatherCode: data.current_weather.weathercode,
            description: getWeatherDescription(data.current_weather.weathercode),
        },
        hourly: {
            time: data.hourly.time,
            temperature_2m: data.hourly.temperature_2m,
            relativehumidity_2m: data.hourly.relativehumidity_2m,
            windspeed_10m: data.hourly.windspeed_10m,
            uv_index: data.hourly.uv_index,
        },
        daily: {
            time: data.daily.time,
            weathercode: data.daily.weathercode,
            temperature_2m_max: data.daily.temperature_2m_max,
            temperature_2m_min: data.daily.temperature_2m_min,
        }
    }
}
