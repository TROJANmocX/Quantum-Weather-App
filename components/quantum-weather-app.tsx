"use client"

import React, { useState, useEffect, useRef } from "react"
// import { animate } from "animejs" // Removed to prevent SSR 500 errors
import { getWeatherData, searchCity, reverseGeocode, getAirQuality, type WeatherData, type AirQualityData, getWeatherDescription } from "@/lib/weather-service"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sun,
  Zap,
  Gauge,
  Search,
  MapPin,
  Loader2,
  Wind,
  Droplets,
  Calendar,
  LocateFixed,
  AlertTriangle,
  Activity,
  Bike,
  Footprints,
  Car,
  Home,
  Terminal,
  Moon,
  ToggleLeft,
  ToggleRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"

// --- Helper Logic for Intelligence ---

const calculateEnvironmentalScore = (data: WeatherData | null, aqi: AirQualityData | null): number => {
  if (!data) return 0;

  let score = 100;
  const temp = data.current.temperature;
  const wind = data.hourly.windspeed_10m[0];
  const uv = data.hourly.uv_index[0];
  const us_aqi = aqi ? aqi.current.us_aqi : 0;

  // Deductions
  if (us_aqi > 50) score -= (us_aqi - 50) * 0.5; // Heavy hit for pollution
  if (uv > 5) score -= (uv - 5) * 4; // Moderate hit for UV
  if (wind > 20) score -= (wind - 20) * 1.5; // Wind

  // Temp comfort bell curve (ideal 18-24)
  const distFromIdeal = Math.abs(temp - 21);
  if (distFromIdeal > 5) score -= (distFromIdeal - 5) * 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

const getActivityAdvice = (data: WeatherData | null, aqi: AirQualityData | null) => {
  if (!data) return [];

  const temp = data.current.temperature;
  const rain = data.current.weatherCode > 50;
  const highWind = data.hourly.windspeed_10m[0] > 25;
  const poorAir = aqi ? aqi.current.us_aqi > 100 : false;

  const advice = [];

  // Running
  if (!rain && !poorAir && temp > 5 && temp < 28) {
    advice.push({ icon: Footprints, label: "Running", status: "Go", color: "text-green-400" });
  } else {
    advice.push({ icon: Footprints, label: "Running", status: "Avoid", color: "text-red-400" });
  }

  // Cycling
  if (!rain && !highWind && !poorAir) {
    advice.push({ icon: Bike, label: "Cycling", status: "Go", color: "text-green-400" });
  } else {
    advice.push({ icon: Bike, label: "Cycling", status: "Wind/Air Risk", color: "text-amber-400" });
  }

  // Driving
  if (data.current.weatherCode > 40 && data.current.weatherCode < 50) { // Fog
    advice.push({ icon: Car, label: "Driving", status: "Low Vis", color: "text-amber-400" });
  } else {
    advice.push({ icon: Car, label: "Driving", status: "Safe", color: "text-green-400" });
  }

  return advice;
}

const getAtmosphericAlert = (data: WeatherData | null, aqi: AirQualityData | null) => {
  if (!data) return null;
  const uv = data.hourly.uv_index[0];
  const wind = data.hourly.windspeed_10m[0];

  if (aqi && aqi.current.us_aqi > 150) return { type: "high", icon: Activity, message: "AIR QUALITY HAZARDOUS", color: "text-red-400" };
  if (uv > 6) return { type: "high", icon: Zap, message: "CRITICAL UV LEVELS DETECTED", color: "text-amber-400" };
  if (wind > 30) return { type: "high", icon: Wind, message: "HIGH VELOCITY WINDS", color: "text-cyan-400" };
  if (data.current.temperature > 35) return { type: "high", icon: Sun, message: "EXTREME HEAT WARNING", color: "text-orange-500" };

  return { type: "stable", icon: Sun, message: "ATMOSPHERE STABLE", color: "text-green-400" };
}

// Logic: "When does this improve?"
const getImprovementTime = (aqi: AirQualityData | null) => {
  if (!aqi || aqi.current.us_aqi <= 100) return null; // Only show if bad

  const currentHour = new Date().getHours();
  // Simplified: Look for next hour where AQI < 100
  // In a real app we'd map hourly index to real time properly
  const hourlyData = aqi.hourly?.us_aqi;
  if (!hourlyData) return null;
  const improvementIndex = hourlyData.findIndex((val, i) => i > currentHour && val < 100);

  if (improvementIndex !== -1) {
    const time = new Date();
    time.setHours(improvementIndex);
    return `Air quality expected to improve after ${time.toLocaleTimeString([], { hour: 'numeric', hour12: true })}.`;
  }
  return "No significant improvement forecast for 24h.";
}

// Logic: Decision Engine (The Brain)
const getDecision = (data: WeatherData | null, aqi: AirQualityData | null) => {
  if (!data) return { verdict: "WAIT", title: "Analyzing...", reason: " gathering atmospheric data", timeAnchor: "Standby", color: "text-slate-400", bg: "bg-slate-500/10" };

  const us_aqi = aqi ? aqi.current.us_aqi : 0;
  const temp = data.current.temperature;
  const uv = data.hourly.uv_index[0];
  const wind = data.hourly.windspeed_10m[0];
  const isRain = data.current.weatherCode >= 51 && data.current.weatherCode <= 67;
  const isStorm = data.current.weatherCode >= 95;
  const currentHour = new Date().getHours();

  // 1. NO GO (Hazardous)
  if (us_aqi > 150) {
    return {
      verdict: "NO",
      title: "Outdoor activity not recommended",
      reason: "Hazardous air quality (high PM2.5)",
      timeAnchor: "Check for improvement after 8 PM", // Simplified for demo
      color: "text-red-400",
      bg: "bg-red-500/10"
    };
  }
  if (isStorm) {
    return {
      verdict: "NO",
      title: "Stay indoors",
      reason: "Storm conditions detected",
      timeAnchor: "Until storm front passes",
      color: "text-red-400",
      bg: "bg-red-500/10"
    };
  }
  if (temp > 40) {
    return {
      verdict: "NO",
      title: "Extreme heat warning",
      reason: "Temperatures unsafe for exertion",
      timeAnchor: "Avoid sun until 5 PM",
      color: "text-red-400",
      bg: "bg-red-500/10"
    };
  }

  // 2. LIMITED (Caution)
  if (us_aqi > 100) {
    return {
      verdict: "LIMITED",
      title: "Limit outdoor exposure",
      reason: "Unhealthy for sensitive groups",
      timeAnchor: "Reduce exertion levels",
      color: "text-orange-400",
      bg: "bg-orange-500/10"
    };
  }
  if (uv > 7) {
    return {
      verdict: "LIMITED",
      title: "Sun protection required",
      reason: "Very high UV levels",
      timeAnchor: "Seek shade (11 AM - 3 PM)",
      color: "text-orange-400",
      bg: "bg-orange-500/10"
    };
  }
  if (wind > 30) {
    return {
      verdict: "LIMITED",
      title: "Caution advised",
      reason: "High winds affecting stability",
      timeAnchor: "Conditions windy all day",
      color: "text-orange-400",
      bg: "bg-orange-500/10"
    };
  }
  if (isRain) {
    return {
      verdict: "LIMITED",
      title: "Wet conditions",
      reason: "Light to moderate rain",
      timeAnchor: "Carry umbrella",
      color: "text-blue-400",
      bg: "bg-blue-500/10"
    };
  }

  // 3. YES (Safe)
  return {
    verdict: "YES",
    title: "Conditions are safe",
    reason: "Air quality and weather are ideal",
    timeAnchor: "Good for all activities",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10"
  };
}


// Weather-First Theme Engine + Time of Day
const getThemeStyles = (data: WeatherData | null, aqi: AirQualityData | null, mode: 'quantum' | 'calm') => {
  if (mode === 'calm') return "bg-slate-50 text-slate-800"; // Calm mode override

  if (!data) return "bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900"; // Toned down purple

  const code = data.current.weatherCode;
  const isHighAQI = aqi && aqi.current.us_aqi > 100;

  // Hazardous Air Override
  if (isHighAQI) {
    if (aqi.current.us_aqi > 150) return "bg-slate-950 shadow-[inset_0_0_100px_rgba(220,38,38,0.2)] sepia-[.3]";
    return "bg-slate-900 shadow-[inset_0_0_80px_rgba(245,158,11,0.15)] grayscale-[0.2]";
  }

  // Weather States
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "bg-slate-900 backdrop-blur-md saturate-[0.8] contrast-[1.1] shadow-[inset_0_0_100px_rgba(56,189,248,0.1)]";
  if ([71, 73, 75, 85, 86].includes(code)) return "bg-slate-900 contrast-125 brightness-110 shadow-[inset_0_0_60px_rgba(34,211,238,0.15)]";
  if (code <= 3) return "bg-slate-900 shadow-[inset_0_0_80px_rgba(168,85,247,0.1)] saturate-[1.1]"; // Reduced purple to 0.1

  return "bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900";
}

const getAQIStatus = (aqi: number) => {
  if (aqi <= 50) return { label: "Good", color: "#4ade80" };
  if (aqi <= 100) return { label: "Moderate", color: "#fbbf24" };
  if (aqi <= 150) return { label: "Unhealthy", color: "#f97316" };
  return { label: "Hazardous", color: "#ef4444" };
}

const chartConfig = {
  temp: {
    label: "Temperature",
    color: "#a855f7",
    icon: Sun,
  },
  aqi: {
    label: "AQI",
    color: "#ef4444",
    icon: Activity
  }
}

// --- Components ---

const DevPanel = ({ show, data, aqi, lat, lon }: { show: boolean, data: any, aqi: any, lat: number, lon: number }) => {
  if (!show) return null;
  return (
    <div className="fixed top-0 right-0 h-screen w-80 bg-black/95 text-green-400 font-mono text-[10px] p-6 z-50 overflow-y-auto border-l border-green-500/20 backdrop-blur-xl shadow-2xl">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-green-500/30 pb-2">
        <Terminal className="h-4 w-4" /> ENGINEER MODE
      </h2>
      <div className="space-y-4">
        <div>
          <p className="text-slate-500">COORDINATES</p>
          <p>LAT: {lat}</p>
          <p>LON: {lon}</p>
        </div>
        <div>
          <p className="text-slate-500">API LATENCY</p>
          <p>~124ms (Cached)</p>
        </div>
        <div>
          <p className="text-slate-500">RENDER FPS</p>
          <p>60.0 STABLE</p>
        </div>
        <div>
          <p className="text-slate-500 mb-1">RAW WEATHER DATA</p>
          <pre className="opacity-70 whitespace-pre-wrap break-all bg-green-900/10 p-2 rounded">
            {JSON.stringify(data?.current, null, 2)}
          </pre>
        </div>
        <div>
          <p className="text-slate-500 mb-1">RAW AQI DATA</p>
          <pre className="opacity-70 whitespace-pre-wrap break-all bg-green-900/10 p-2 rounded">
            {JSON.stringify(aqi?.current, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

const WeatherCard = ({ data, city, coords, loading, decision, mode }: { data: WeatherData | null, city: string, coords: string, loading: boolean, decision: any, mode: 'quantum' | 'calm' }) => {
  const orbRef = useRef(null)

  useEffect(() => {
    if (orbRef.current) {
      import("animejs").then((mod) => {
        const animate = mod.animate || (mod as any).default;
        animate(orbRef.current!, {
          rotateY: "360deg",
          rotateX: "360deg",
          duration: 25000,
          easing: "linear",
          loop: true,
        });
      });
    }
  }, [])

  return (
    <div className={`relative w-full h-auto min-h-[400px] mb-6 overflow-hidden rounded-[2rem] glass-panel transition-all duration-500 group border-white/5`}>
      <div
        ref={orbRef}
        className="absolute w-[600px] h-[600px] -top-20 -left-20 rounded-full bg-gradient-to-r from-violet-600/10 via-fuchsia-500/10 to-indigo-600/10 blur-3xl animate-spin-slow group-hover:opacity-40 transition-opacity duration-700"
      ></div>

      <div className="relative z-10 flex flex-col items-center justify-between py-8 h-full space-y-4">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur-lg opacity-50 animate-pulse"></div>
              <Loader2 className="h-12 w-12 text-white relative z-10 animate-spin" />
            </div>
            <p className="text-purple-200 font-mono tracking-[0.2em] text-xs uppercase animate-pulse">Synchronizing...</p>
          </div>
        ) : data ? (
          <>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-purple-200/80">
                <MapPin className="h-4 w-4 text-purple-400" />
                <h2 className="text-xl font-bold tracking-[0.1em] text-white uppercase">{city}</h2>
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-1 tracking-widest">{coords}</p>
            </div>

            <div className="flex flex-col items-center relative group/temp cursor-default">
              <Sun className="text-amber-300 drop-shadow-[0_0_30px_rgba(252,211,77,0.4)] animate-pulse mb-2 relative z-10" size={64} />
              <p className="text-7xl font-black text-white tracking-tighter drop-shadow-2xl relative z-10">
                {Math.round(data.current.temperature)}°
              </p>
              <p className="text-lg text-purple-200 font-light tracking-widest uppercase mt-1 relative z-10">{data.current.description}</p>
            </div>

            {/* Human Impact Summary - The "Headline" */}
            {/* Decision Panel (The "Brain") */}
            <div className={`mt-2 px-6 py-4 rounded-2xl w-full max-w-sm backdrop-blur-md border border-white/5 flex flex-col items-center gap-2 ${decision.bg}`}>
              <div className={`text-xs font-black tracking-widest px-3 py-1 rounded-full bg-black/20 ${decision.color}`}>
                {decision.verdict}
              </div>
              <p className={`text-sm font-bold text-center leading-tight ${mode === 'calm' ? 'text-slate-700' : 'text-slate-200'}`}>
                {decision.title}
              </p>
              <div className="h-px w-12 bg-current opacity-20 my-1"></div>
              <p className={`text-[10px] font-mono text-center opacity-80 ${mode === 'calm' ? 'text-slate-500' : 'text-slate-400'}`}>
                {decision.reason}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${decision.color} animate-pulse`}></div>
                <p className={`text-[9px] uppercase tracking-wider font-bold ${mode === 'calm' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {decision.timeAnchor}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full max-w-sm px-6 pt-2">
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-all">
                <Wind className={`h-4 w-4 text-cyan-400 mb-1 ${data.hourly.windspeed_10m[0] > 20 ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Wind</span>
                <span className="text-sm font-bold text-white font-mono">{data.hourly.windspeed_10m[0]}<span className="text-[10px] text-slate-500 ml-1">km/h</span></span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-all">
                <Droplets className="h-4 w-4 text-blue-400 mb-1" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Humid</span>
                <span className="text-sm font-bold text-white font-mono">{data.hourly.relativehumidity_2m[0]}<span className="text-[10px] text-slate-500 ml-1">%</span></span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-all">
                <Zap className={`h-4 w-4 mb-1 ${data.hourly.uv_index[0] > 5 ? 'text-amber-400' : 'text-green-400'}`} />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">UV</span>
                <span className="text-sm font-bold text-white font-mono">{data.hourly.uv_index[0]}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2 text-center">
            <p className="text-slate-500 font-light">Standby</p>
          </div>
        )}
      </div>
    </div>
  )
}

const CircularProgress = ({ value, max, label, color = "#a855f7", subLabel = "" }: { value: number; max: number, label: string, color?: string, subLabel?: string }) => {
  const circleRef = useRef(null)
  const textRef = useRef(null)

  const radius = 60
  const stroke = 6
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const safeValue = isNaN(value) ? 0 : value;
  const strokeDashoffset = circumference - (safeValue / max) * circumference

  useEffect(() => {
    if (circleRef.current) {
      import("animejs").then((mod) => {
        const animate = mod.animate || (mod as any).default;
        animate(circleRef.current!, {
          strokeDashoffset: [circumference, strokeDashoffset],
          duration: 2500,
          easing: "easeOutElastic(1, .8)",
        });
      });
    }
    if (textRef.current && !isNaN(value)) {
      import("animejs").then((mod) => {
        const animate = mod.animate || (mod as any).default;
        animate(textRef.current!, {
          textContent: [0, value],
          round: 1,
          duration: 2500,
          easing: "easeOutExpo",
        });
      });
    }
  }, [value, circumference, strokeDashoffset])

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <div className="absolute inset-0 bg-white/5 rounded-full blur-xl" style={{ backgroundColor: `${color}15` }}></div>
      <svg height="100%" width="100%" className="relative z-10 rotate-[-90deg]">
        <circle
          stroke="rgba(255,255,255,0.05)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset: 0 }}
          r={normalizedRadius}
          cx="50%"
          cy="50%"
        />
        <circle
          ref={circleRef}
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          strokeLinecap="round"
          style={{ strokeDashoffset: circumference }}
          r={normalizedRadius}
          cx="50%"
          cy="50%"
          className="drop-shadow-[0_0_10px_currentColor]"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span ref={textRef} className="text-3xl font-black text-white tracking-tighter">0</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">{label}</span>
        {subLabel && <span className="text-[8px] text-slate-500 uppercase tracking-wider">{subLabel}</span>}
      </div>
    </div>
  )
}

export function QuantumWeatherApp() {
  const [mode, setMode] = useState<'quantum' | 'calm'>('quantum');
  const [city, setCity] = useState("Initializing...")
  const [coordsDisplay, setCoordsDisplay] = useState("00.0000° N, 00.0000° E");
  // Store lat/lon for DevPanel
  const [currentCoords, setCurrentCoords] = useState({ lat: 0, lon: 0 });

  const [searchQuery, setSearchQuery] = useState("")
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [aqiData, setAqiData] = useState<AirQualityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [footerFact, setFooterFact] = useState("System Standby")
  const [showDevPanel, setShowDevPanel] = useState(false)

  const factBarRef = useRef(null)

  const themeClass = getThemeStyles(weatherData, aqiData, mode);
  const aqiStatus = aqiData ? getAQIStatus(aqiData.current.us_aqi) : { label: "N/A", color: "#555" };
  const alertStatus = getAtmosphericAlert(weatherData, aqiData);
  const envScore = calculateEnvironmentalScore(weatherData, aqiData);
  const activities = getActivityAdvice(weatherData, aqiData);
  const decision = getDecision(weatherData, aqiData);
  const improvementTime = getImprovementTime(aqiData);

  // Easter Egg Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
        setShowDevPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (envScore === 100) setFooterFact("ATMOSPHERIC PERFECTION ACHIEVED.");
    else if (aqiData && aqiData.current.us_aqi > 200) setFooterFact("THE AIR HAS CHOSEN VIOLENCE.");
    else if (loading) setFooterFact("CALCULATING QUANTUM PROBABILITIES...");
    else if (city !== "Initializing...") setFooterFact(`OBSERVATION CONFIRMED: ${city.toUpperCase()}`);
  }, [envScore, aqiData, loading, city]);


  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    try {
      setLoading(true)
      setError("")
      setCurrentCoords({ lat, lon });

      const [weather, aqi, location] = await Promise.all([
        getWeatherData(lat, lon),
        getAirQuality(lat, lon),
        reverseGeocode(lat, lon)
      ])

      setWeatherData(weather)
      setAqiData(aqi)
      setCity(`${location.name}, ${location.country}`)
      setCoordsDisplay(`${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`)

    } catch (err) {
      console.error(err)
      setError("Connection failed. Initializing standard protocols.")
      fetchWeather("London")
    } finally {
      setLoading(false)
    }
  }

  const fetchWeather = async (cityName: string) => {
    try {
      setLoading(true)
      setError("")

      const locations = await searchCity(cityName)
      if (locations.length === 0) {
        setError("Location not found.")
        setLoading(false)
        return
      }

      const { latitude, longitude, name, country } = locations[0]
      setCurrentCoords({ lat: latitude, lon: longitude });
      setCity(`${name}, ${country}`)
      setCoordsDisplay(`${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`)

      const [weather, aqi] = await Promise.all([
        getWeatherData(latitude, longitude),
        getAirQuality(latitude, longitude)
      ]);

      setWeatherData(weather)
      setAqiData(aqi)

    } catch (err) {
      console.error(err)
      setError("Data retrieval failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleUseLocation = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
          setError("Access Denied.");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }

  // Initial Load: Try Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
          fetchWeather("London"); // Fallback
        }
      );
    } else {
      fetchWeather("London");
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      fetchWeather(searchQuery)
    }
  }

  // Reactive Footer Animation
  useEffect(() => {
    if (!factBarRef.current) return
    import("animejs").then((mod) => {
      const animate = mod.animate || (mod as any).default;
      animate(factBarRef.current!, {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 800,
        easing: "easeOutQuad",
      });
    });
  }, [footerFact])


  const chartData = weatherData?.hourly.time.map((t, i) => ({
    time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temp: weatherData.hourly.temperature_2m[i]
  })).slice(0, 24).filter((_, i) => i % 2 === 0) || []

  // Trend Sparkline Data for AQI
  const trendData = aqiData?.hourly?.us_aqi ? aqiData.hourly.us_aqi.slice(0, 24).map((val, i) => ({
    i, val
  })) : [];

  const temps = chartData.map(d => d.temp);
  const minTemp = Math.floor(Math.min(...temps, 0) - 2);
  const maxTemp = Math.ceil(Math.max(...temps, 30) + 2);

  // Calm Mode Styles Override
  const containerClass = mode === 'calm' ? 'bg-slate-50 text-slate-800' : themeClass;
  const glassPanelClass = mode === 'calm' ? 'bg-white border border-slate-200 shadow-sm' : 'glass-panel border-white/5';
  const textClass = mode === 'calm' ? 'text-slate-800' : 'text-white';
  const subTextClass = mode === 'calm' ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen flex flex-col transition-all duration-[2000ms] ${containerClass}`}>

      <DevPanel show={showDevPanel} data={weatherData} aqi={aqiData} lat={currentCoords.lat} lon={currentCoords.lon} />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <h1 className={`text-2xl md:text-3xl font-black tracking-tighter uppercase relative group cursor-pointer z-20 ${mode === 'calm' ? 'text-slate-900' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400'}`}>
          Quantum<span className="text-purple-500">.</span>Weather
        </h1>

        <div className="flex items-center gap-2 w-full md:w-auto max-w-md z-20">
          {/* Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMode(m => m === 'quantum' ? 'calm' : 'quantum')}
            className={`rounded-full h-12 w-12 transition-all ${mode === 'calm' ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/5 border border-white/10 text-purple-400 hover:bg-purple-600 hover:text-white'}`}
            title="Toggle Mode"
          >
            {mode === 'quantum' ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleUseLocation}
            className={`rounded-full h-12 w-12 transition-all shadow-lg ${mode === 'calm' ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/5 border border-white/10 text-purple-400 hover:bg-purple-600 hover:text-white'}`}
          >
            <LocateFixed className="h-5 w-5" />
          </Button>

          <form onSubmit={handleSearch} className="relative flex-1 group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors h-5 w-5 ${mode === 'calm' ? 'text-slate-400' : 'text-slate-400 group-hover:text-white'}`} />
            <Input
              type="text"
              placeholder="CITY / COORDS..."
              className={`pl-12 pr-28 py-6 rounded-full transition-all font-mono text-sm tracking-wide shadow-none w-full ${mode === 'calm' ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-purple-500/50'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              type="submit"
              className="absolute right-1 top-1 top-1/2 -translate-y-1/2 rounded-full bg-purple-600 hover:bg-purple-500 text-white px-6 h-10 font-bold text-xs tracking-widest shadow-lg shadow-purple-900/20"
            >
              SCAN
            </Button>
          </form>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-6 py-4 rounded-xl text-center backdrop-blur-md mb-8 font-mono text-sm flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 flex-1">

        {/* Left Column (4 cols) - HEALTH & SCORE */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Summary passed to WeatherCard for display */}
          <WeatherCard data={weatherData} city={city} coords={coordsDisplay} loading={loading} decision={decision} mode={mode} />

          {/* Environmental Score & AQI Combined */}
          <div className={`${glassPanelClass} rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden group min-h-[200px] ${aqiStatus.color === '#ef4444' ? 'border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : ''}`}>
            <div className="grid grid-cols-2 w-full gap-4">
              <div className="flex flex-col items-center justify-center">
                <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${subTextClass}`}>Env. Comfort</h3>
                <CircularProgress
                  value={envScore}
                  max={100}
                  label={envScore > 80 ? "Excellent" : envScore > 50 ? "Acceptable" : "Poor"}
                  color={envScore > 80 ? "#4ade80" : envScore > 50 ? "#facc15" : "#ef4444"}
                />
              </div>
              <div className={`flex flex-col items-center justify-center border-l pl-4 ${mode === 'calm' ? 'border-slate-200' : 'border-white/5'}`}>
                <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${subTextClass}`}>Air Quality</h3>
                <CircularProgress
                  value={aqiData?.current.us_aqi || 0}
                  max={300}
                  label={aqiStatus.label}
                  color={aqiStatus.color}
                  subLabel={`PM2.5: ${aqiData?.current.pm2_5 || 0}`}
                />
                {/* Improvement Time Prediction */}
                {improvementTime && (
                  <p className="text-[9px] text-slate-500 mt-2 text-center leading-tight max-w-[100px]">{improvementTime}</p>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Confidence / Alerts */}
          <div className={`${glassPanelClass} rounded-3xl p-4 flex items-center justify-between min-h-[80px]`}>
            {alertStatus ? (
              <div className="flex items-center gap-3 w-full">
                <div className={`p-2 rounded-full ${mode === 'calm' ? 'bg-slate-100' : 'bg-white/5'} ${alertStatus.color}`}>
                  <alertStatus.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-[10px] font-mono uppercase ${subTextClass}`}>Status</p>
                  <p className={`text-xs font-bold ${alertStatus.color} tracking-wide`}>{alertStatus.message}</p>
                </div>
              </div>
            ) : (
              <div className={`text-center w-full font-mono text-xs ${subTextClass}`}>ANALYZING...</div>
            )}
          </div>
        </div>

        {/* Right Column (8 cols) - DATA & ADVICE */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Chart & Trend */}
          <div className={`${glassPanelClass} rounded-3xl p-8 h-[340px] flex flex-col relative group`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Gauge className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold tracking-wide ${textClass}`}>Temporal Flux</h3>
                  <p className={`text-[10px] font-mono tracking-widest ${subTextClass}`}>24H TEMPERATURE PROJECTION</p>
                </div>
              </div>
              {/* AQI Sparkline Logic could replace this, but for now we keep Temp Chart as main */}
              {aqiData && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className={`text-[10px] font-mono uppercase ${subTextClass}`}>AQI Trend</span>
                  <div className="h-8 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <Area type="monotone" dataKey="val" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 w-full min-h-0">
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={mode === 'calm' ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"} vertical={false} />
                    <XAxis hide dataKey="time" />
                    <YAxis hide domain={[minTemp, maxTemp]} />

                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className={`${mode === 'calm' ? 'bg-white text-slate-900 border-slate-200' : 'bg-slate-900/90 text-white border-slate-700'} font-mono text-xs shadow-xl backdrop-blur-xl`}
                        />
                      }
                    />
                    <ReferenceLine x={chartData[0]?.time} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      stroke="#a855f7"
                      strokeWidth={4}
                      dot={{ r: 0 }}
                      activeDot={{ r: 6, fill: "#fff", stroke: "#a855f7", strokeWidth: 0 }}
                      animationDuration={2000}
                      fill="url(#chartGradient)"
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className={`w-full h-full flex items-center justify-center font-mono text-sm animate-pulse ${subTextClass}`}>
                  AWAITING DATA STREAM...
                </div>
              )}
            </div>
          </div>

          {/* Activity Recommendation Engine */}
          <div className={`${glassPanelClass} rounded-3xl p-6 flex flex-col`}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-purple-400" />
              <h3 className={`text-xs font-bold uppercase tracking-widest ${subTextClass}`}>Activity Recommendation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activities.map((act, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl ${mode === 'calm' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                  <act.icon className={`h-5 w-5 ${act.color === 'text-green-400' ? 'text-green-400' : act.color === 'text-red-400' ? 'text-red-400' : 'text-amber-400'}`} />
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${textClass}`}>{act.label}</span>
                    <span className={`text-[10px] font-mono tracking-wide ${act.color}`}>{act.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <div className={`text-xs ${subTextClass}`}>Loading advice...</div>}
            </div>
          </div>

          {/* 7-Day List */}
          <div className={`${glassPanelClass} rounded-3xl p-8 flex-1 flex flex-col`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className={`text-lg font-bold tracking-wide ${textClass}`}>Projection Horizon (7D)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {weatherData?.daily.time.map((date, index) => (
                <div key={date} className={`flex flex-col items-center justify-between p-4 rounded-2xl transition-all group cursor-default ${mode === 'calm' ? 'bg-slate-50 border-slate-100 hover:bg-slate-100' : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-500/30'}`}>
                  <span className={`font-mono text-[10px] uppercase tracking-wider mb-2 ${subTextClass}`}>
                    {new Date(date).toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>

                  <div className="mb-2">
                    <Sun className="h-6 w-6 text-amber-300 opacity-80 group-hover:scale-110 transition-transform" />
                  </div>

                  <div className="flex items-baseline gap-1 font-mono text-sm">
                    <span className={`font-bold ${textClass}`}>{Math.round(weatherData.daily.temperature_2m_max[index])}°</span>
                    <span className={`${subTextClass} text-[10px]`}>{Math.round(weatherData.daily.temperature_2m_min[index])}°</span>
                  </div>
                </div>
              ))}
              {!weatherData && Array(7).fill(0).map((_, i) => (
                <div key={i} className={`h-24 rounded-2xl animate-pulse ${mode === 'calm' ? 'bg-slate-100' : 'bg-white/5'}`}></div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div
        ref={factBarRef}
        className={`text-center text-[10px] font-mono uppercase tracking-[0.3em] py-4 ${subTextClass}`}
      >
        {footerFact}
      </div>
    </div>
  )
}
