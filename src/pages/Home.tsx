import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, ChevronRight, Star } from "lucide-react";

type Step = "splash" | "step1";

export default function Home() {
  const [step, setStep] = useState<Step>("splash");
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setStep("step1"), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-svh bg-gradient-to-br from-green-700 via-green-600 to-green-800 flex flex-col p-4 overflow-y-auto overflow-x-hidden">
      {/* Main content — grows to fill space and centres vertically */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <AnimatePresence mode="wait">
          {step === "splash" && <SplashScreen key="splash" />}
          {step === "step1" && (
            <Step1
              key="step1"
              onNext={(isCorpsMember) =>
                navigate(isCorpsMember ? "/register" : "/login")
              }
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer — always visible at the bottom, never pushed off screen */}
      <div className="py-3 text-center flex-shrink-0">
        <p className="text-white/80 text-xs sm:text-sm">
          An effort from{" "}
          <span className="font-semibold text-white">
            Batch C 2025 Evaluation Committee
          </span>
        </p>
      </div>
    </div>
  );
}

function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="bg-white/20 backdrop-blur-sm rounded-full p-6 sm:p-8 mb-6"
      >
        <Shield className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-3xl sm:text-4xl font-bold text-white mb-2"
      >
        NYSC
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-green-100 text-lg sm:text-xl"
      >
        Camp Evaluation System
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex items-center gap-2 mt-5"
      >
        {[0, 1, 2].map((i) => (
          <Star key={i} className="w-5 h-5 text-yellow-300 fill-yellow-300" />
        ))}
      </motion.div>
    </motion.div>
  );
}

function Step1({ onNext }: { onNext: (isCorpsMember: boolean) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-md"
    >
      {/* Card header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="bg-white/20 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Users className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Welcome</h2>
        <p className="text-green-100 mt-1 text-sm">Who are you?</p>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => onNext(true)}
          className="w-full py-4 px-4 sm:px-6 bg-white hover:bg-green-50 text-green-800 rounded-2xl font-semibold text-base transition-colors flex items-center justify-between gap-3 group shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-green-700" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-800">Corps Member</p>
              <p className="text-xs text-gray-500 font-normal">Register / Submit your details</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => onNext(false)}
          className="w-full py-4 px-4 sm:px-6 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-semibold text-base transition-colors flex items-center justify-between gap-3 group border border-white/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold">Staff / Official</p>
              <p className="text-xs text-green-100 font-normal">Login to your dashboard</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </motion.button>
      </div>
    </motion.div>
  );
}
