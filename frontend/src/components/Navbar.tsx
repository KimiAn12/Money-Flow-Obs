import { NavLink } from "@/components/NavLink";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useState, useEffect } from "react";

export const Navbar = () => {
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsLive((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.nav
      className="sticky top-0 z-50 glass-card border-b border-border/50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">💸</span>
            <h1 className="text-xl font-bold glow-cyan">Money Flow Observatory</h1>
          </div>

          <div className="flex items-center gap-6">
            <NavLink
              to="/"
              className="px-4 py-2 rounded-lg transition-all text-muted-foreground hover:text-foreground"
              activeClassName="text-primary border-glow-cyan"
            >
              Home
            </NavLink>
            <NavLink
              to="/industry-flow"
              className="px-4 py-2 rounded-lg transition-all text-muted-foreground hover:text-foreground"
              activeClassName="text-primary border-glow-cyan"
            >
              Industry Flow
            </NavLink>
            <NavLink
              to="/global-markets"
              className="px-4 py-2 rounded-lg transition-all text-muted-foreground hover:text-foreground"
              activeClassName="text-secondary border-glow-purple"
            >
              Global Markets
            </NavLink>
          </div>

          <motion.div
            className="flex items-center gap-2 px-3 py-2 rounded-full glass-card border-glow-cyan"
            animate={{ opacity: isLive ? 1 : 0.6 }}
            transition={{ duration: 0.5 }}
          >
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Live Data</span>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
};
