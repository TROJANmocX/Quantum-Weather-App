"use client"

import React, { useState, useEffect, useRef } from "react"
// animejs is dynamically imported where needed to avoid CJS/ESM interop issues
import { Tooltip as RechartsTooltip } from 'recharts';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Cloud,
  Sun,
  Zap,
  Snowflake,
  Tornado,
  Ghost,
  Atom,
  Gauge,
} from "lucide-react"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"

const weatherData = [
  { time: "6AM", temp: 12 },
  { time: "9AM", temp: 15 },
  { time: "12PM", temp: 20 },
  { time: "3PM", temp: 22 },
  { time: "6PM", temp: 19 },
  { time: "9PM", temp: 16 },
]

const quantumFacts = [
  "Quantum fluctuations affect your umbrella usage.",
  "You’re 84% likely to experience entangled rain today.",
  "This weather was observed into existence.",
  "Clouds might be in a superposition of sunny and rainy.",
  "Don’t blame us if it’s Schrödinger’s drizzle.",
]

const chartConfig = {
  temp: {
    label: "Temperature",
    color: "#38bdf8",
    icon: Sun,
  },
}

const WeatherCard = () => {
  const orbRef = useRef(null)

  useEffect(() => {
    if (orbRef.current) {
      import("animejs").then((anime) => {
        const fn = anime.default || anime;
        fn({
          targets: orbRef.current,
          rotateY: "360deg",
          rotateX: "360deg",
          duration: 20000,
          easing: "linear",
          loop: true,
        });
      });
    }
  }, [])

  return (
    <div className="relative w-full h-32 mb-4">
      <div
        ref={orbRef}
        className="absolute top-0 left-0 w-32 h-32 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 opacity-50 blur-xl animate-spin-slow"
      ></div>
      <div className="relative z-10 text-center">
        <Sun className="mx-auto text-yellow-400 animate-pulse" size={48} />
        <p className="text-lg font-semibold text-white">Quantum Sunny</p>
        <p className="text-sm text-white/80">Temp: 21°C</p>
      </div>
    </div>
  )
}

const CircularProgress = ({ value, max }: { value: number; max: number }) => {
  const circleRef = useRef(null)
  const textRef = useRef(null)

  const radius = 50
  const stroke = 8
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset =
    circumference - (value / max) * circumference

  useEffect(() => {
    if (circleRef.current) {
      import("animejs").then((anime) => {
        const fn = anime.default || anime;
        fn({
          targets: circleRef.current,
          strokeDashoffset: [circumference, strokeDashoffset],
          duration: 1500,
          easing: "easeInOutQuad",
        });
      });
    }
    if (textRef.current) {
      import("animejs").then((anime) => {
        const fn = anime.default || anime;
        fn({
          targets: textRef.current,
          textContent: [0, value],
          round: 1,
          duration: 1500,
          easing: "easeInOutQuad",
        });
      });
    }
  }, [value, circumference, strokeDashoffset])

  return (
    <div className="relative w-24 h-24">
      <svg height="100%" width="100%">
        <circle
          stroke="#4F46E5"
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
          stroke="#818CF8"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          strokeLinecap="round"
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx="50%"
          cy="50%"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm text-white">
        <span ref={textRef}>0</span>%
      </div>
    </div>
  )
}

export function QuantumWeatherApp() {
  const [currentFactIndex, setCurrentFactIndex] = useState(0)
  const factBarRef = useRef(null)
  const stabilizeButtonRef = useRef(null)

  const handleStabilize = () => {
    import("animejs").then((anime) => {
      const fn = anime.default || anime;
      fn({
        targets: stabilizeButtonRef.current,
        scale: [1, 1.08, 1],
        boxShadow: [
          "0 0 10px var(--neon-purple), 0 0 20px var(--neon-purple)",
          "0 0 20px var(--neon-blue), 0 0 40px var(--neon-blue)",
          "0 0 10px var(--neon-purple), 0 0 20px var(--neon-purple)",
        ],
        duration: 800,
        easing: "easeInOutQuad",
        complete: () => {
          alert("Timeline Stabilized! (For now...)");
        },
      });
    });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      import("animejs").then((anime) => {
        const fn = anime.default || anime;
        fn({
          targets: factBarRef.current,
          opacity: [1, 0],
          translateY: [0, -10],
          duration: 500,
          easing: "easeOutQuad",
          complete: () => {
            setCurrentFactIndex((prev) => (prev + 1) % quantumFacts.length);
            import("animejs").then((anime) => {
              const fn = anime.default || anime;
              fn({
                targets: factBarRef.current,
                opacity: [0, 1],
                translateY: [10, 0],
                duration: 500,
                easing: "easeOutQuad",
              });
            });
          },
        });
      });
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <WeatherCard />

      <Card className="bg-gradient-to-br from-indigo-700 to-purple-700 text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="text-yellow-300" />
            Timeline Stability
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <CircularProgress value={72} max={100} />
          <Button
            ref={stabilizeButtonRef}
            className="bg-purple-600 hover:bg-purple-800 transition-all duration-300"
            onClick={handleStabilize}
          >
            Stabilize Now
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-800 to-blue-600 text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="text-cyan-300" />
            Weather Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weatherData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <RechartsTooltip />
          </ChartContainer>
        </CardContent>
      </Card>

      <div
        ref={factBarRef}
        className="text-center text-sm text-purple-100 animate-fade-in"
      >
        {quantumFacts[currentFactIndex]}
      </div>
    </div>
  )
}
