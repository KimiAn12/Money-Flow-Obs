import { motion } from "framer-motion";
import { ArrowRight, Globe, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

export default function Hero() {
  const navigate = useNavigate();
  const aboutSectionRef = useRef<HTMLDivElement>(null);

  const scrollToAbout = () => {
    if (aboutSectionRef.current) {
      // Get navbar height dynamically
      const navbar = document.querySelector('nav');
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 80;
      
      // Get the About section's position
      const aboutSection = aboutSectionRef.current;
      const elementTop = aboutSection.getBoundingClientRect().top + window.pageYOffset;
      
      // Scroll to position accounting for navbar
      window.scrollTo({
        top: elementTop - navbarHeight,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <div className="relative min-h-[85vh] flex items-center justify-center pt-8 pb-20">
        <div className="container mx-auto px-4 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-4"
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Money Flow Observatory
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-semibold">
                Real-Time Capital Flow Analytics Across Global Financial Markets
              </p>
              <p className="text-lg text-muted-foreground mb-6 max-w-3xl mx-auto">
                Track how money moves between asset classes and economies in real-time. 
                Visualize correlations, flow intensity, and capital movements with advanced 
                financial analytics powered by live market data.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                onClick={() => navigate("/industry-flow")}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white px-8 py-6 text-lg"
              >
                Explore Industry Flow
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/global-markets")}
                className="px-8 py-6 text-lg border-2"
              >
                View Global Markets
                <Globe className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Scroll Button - Fixed at bottom of hero section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <button
            onClick={scrollToAbout}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer animate-bounce flex items-center justify-center"
            aria-label="Scroll down"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </motion.div>
      </div>

      {/* About Section */}
      <div 
        ref={aboutSectionRef} 
        id="about"
        className="container mx-auto px-4 pt-8 pb-20 min-h-screen flex items-center scroll-mt-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto w-full"
        >
          <motion.h2 
            className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            About Money Flow Observatory
          </motion.h2>

          {/* Interactive Introduction Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ scale: 1.03, y: -8, rotate: 1 }}
              className="glass-card p-8 rounded-xl border-2 border-border/50 hover:border-cyan-500/50 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-5">
                  <motion.div 
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg"
                    whileHover={{ scale: 1.2, rotate: 360 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-3xl">💸</span>
                  </motion.div>
                  <h3 className="text-2xl font-bold group-hover:text-cyan-400 transition-colors">
                    Real-Time Insights
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-base">
                  Money Flow Observatory is a cutting-edge platform that provides <span className="font-semibold text-cyan-400">real-time insights</span> into 
                  capital movements across global financial markets. Our mission is to help investors, 
                  analysts, and financial professionals understand how money flows between different asset 
                  classes and economies in real-time.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.03, y: -8, rotate: -1 }}
              className="glass-card p-8 rounded-xl border-2 border-border/50 hover:border-purple-500/50 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-5">
                  <motion.div 
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg"
                    whileHover={{ scale: 1.2, rotate: -360 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-3xl">📊</span>
                  </motion.div>
                  <h3 className="text-2xl font-bold group-hover:text-purple-400 transition-colors">
                    Dynamic Visualization
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-base">
                  We track five key asset classes—<span className="font-semibold text-cyan-400">Stocks</span>, <span className="font-semibold text-purple-400">Bonds</span>, 
                  <span className="font-semibold text-pink-400"> Commodities</span>, <span className="font-semibold text-yellow-400">Crypto</span>, and <span className="font-semibold text-green-400">Cash</span>—and 
                  visualize their relationships through dynamic, interactive network graphs that update in real-time.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Interactive Asset Classes Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass-card p-10 rounded-xl border-2 border-border/50 mb-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5"></div>
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-8 text-center bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Track Five Key Asset Classes
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
                {[
                  { name: "Stocks", colorClass: "text-cyan-400", borderColor: "border-cyan-500/50", bgColor: "bg-cyan-500/10", emoji: "📈", description: "Equity markets" },
                  { name: "Bonds", colorClass: "text-purple-400", borderColor: "border-purple-500/50", bgColor: "bg-purple-500/10", emoji: "📉", description: "Fixed income" },
                  { name: "Commodities", colorClass: "text-pink-400", borderColor: "border-pink-500/50", bgColor: "bg-pink-500/10", emoji: "⛽", description: "Raw materials" },
                  { name: "Crypto", colorClass: "text-yellow-400", borderColor: "border-yellow-500/50", bgColor: "bg-yellow-500/10", emoji: "₿", description: "Digital assets" },
                  { name: "Cash", colorClass: "text-green-400", borderColor: "border-green-500/50", bgColor: "bg-green-500/10", emoji: "💵", description: "Liquidity" }
                ].map((asset, index) => (
                  <motion.div
                    key={asset.name}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1, type: "spring", stiffness: 100 }}
                    whileHover={{ scale: 1.15, y: -10, rotate: 5 }}
                    className="text-center p-6 rounded-xl border-2 border-border/30 hover:border-cyan-500/70 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className={`absolute inset-0 ${asset.bgColor} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                    <div className="relative z-10">
                      <motion.div 
                        className="text-5xl mb-3 group-hover:scale-150 transition-transform"
                        animate={{ 
                          y: [0, -5, 0],
                        }}
                        transition={{ 
                          duration: 1,
                          repeat: Infinity,
                          delay: index * 0.1,
                          ease: "easeInOut"
                        }}
                      >
                        {asset.emoji}
                      </motion.div>
                      <div className={`font-bold text-lg mb-1 ${asset.colorClass} transition-colors`}>
                        {asset.name}
                      </div>
                      <div className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        {asset.description}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.p 
                className="text-center text-muted-foreground mt-6 text-base leading-relaxed"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                Each node's size reflects <span className="font-semibold text-cyan-400">net capital inflows or outflows</span>, while edges illustrate 
                <span className="font-semibold text-purple-400"> correlations and flow intensity</span> between assets in real-time.
              </motion.p>
            </div>
          </motion.div>

          {/* Interactive Feature Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-12"
          >
            <motion.h3 
              className="text-3xl md:text-4xl font-bold mb-10 text-center bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Key Features
            </motion.h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: "🌊",
                  title: "Real-Time Visualization",
                  description: "Dynamic node sizes based on net inflows/outflows with live market data updates",
                  colorClass: "text-cyan-400",
                  hoverColorClass: "group-hover:text-cyan-300",
                  gradient: "from-cyan-500 to-blue-600",
                  borderColor: "hover:border-cyan-500/70"
                },
                {
                  icon: "🔗",
                  title: "Correlation Analysis",
                  description: "Identify diversification opportunities and relationships between asset pairs",
                  colorClass: "text-purple-400",
                  hoverColorClass: "group-hover:text-purple-300",
                  gradient: "from-purple-500 to-pink-600",
                  borderColor: "hover:border-purple-500/70"
                },
                {
                  icon: "⚡",
                  title: "Flow Intensity Metrics",
                  description: "Combine correlation strength with normalized capital flows for comprehensive analysis",
                  colorClass: "text-pink-400",
                  hoverColorClass: "group-hover:text-pink-300",
                  gradient: "from-pink-500 to-rose-600",
                  borderColor: "hover:border-pink-500/70"
                },
                {
                  icon: "🌍",
                  title: "Global Market Tracking",
                  description: "Monitor capital flows across major economies: USA, China, Europe, Japan, and India",
                  colorClass: "text-cyan-400",
                  hoverColorClass: "group-hover:text-cyan-300",
                  gradient: "from-cyan-500 to-teal-600",
                  borderColor: "hover:border-cyan-500/70"
                },
                {
                  icon: "📱",
                  title: "Interactive Graphs",
                  description: "Engage with real-time network graphs that respond to market movements instantly",
                  colorClass: "text-purple-400",
                  hoverColorClass: "group-hover:text-purple-300",
                  gradient: "from-purple-500 to-indigo-600",
                  borderColor: "hover:border-purple-500/70"
                },
                {
                  icon: "🚀",
                  title: "Daily Data Updates",
                  description: "Automated daily updates at 5 PM with data from Alpha Vantage and FRED APIs",
                  colorClass: "text-pink-400",
                  hoverColorClass: "group-hover:text-pink-300",
                  gradient: "from-pink-500 to-orange-600",
                  borderColor: "hover:border-pink-500/70"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1, type: "spring", stiffness: 100 }}
                  whileHover={{ scale: 1.08, y: -12, rotate: 2, zIndex: 10 }}
                  className="glass-card p-6 rounded-xl border-2 border-border/50 transition-all cursor-pointer group relative overflow-hidden h-full"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-300`}></div>
                  <div className="relative z-10 h-full flex flex-col">
                    <motion.div 
                      className="text-5xl mb-4 group-hover:scale-150 group-hover:rotate-12 transition-transform duration-300"
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.15,
                        ease: "easeInOut"
                      }}
                    >
                      {feature.icon}
                    </motion.div>
                    <h4 className={`font-bold text-lg mb-3 ${feature.colorClass} ${feature.hoverColorClass} transition-colors`}>
                      {feature.title}
                    </h4>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed flex-grow">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Interactive Statistics Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            {[
              { number: "5", label: "Asset Classes", icon: "📊", color: "from-cyan-500 to-blue-600" },
              { number: "5", label: "Global Regions", icon: "🌍", color: "from-purple-500 to-pink-600" },
              { number: "24/7", label: "Daily Updates", icon: "🔄", color: "from-pink-500 to-orange-600" }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.1, y: -10 }}
                className="glass-card p-8 rounded-xl border-2 border-border/50 text-center group cursor-pointer relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-20 transition-opacity`}></div>
                <div className="relative z-10">
                  <div className="text-5xl mb-4">{stat.icon}</div>
                  <motion.div
                    className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: index * 0.25 }}
                  >
                    {stat.number}
                  </motion.div>
                  <div className="text-muted-foreground font-semibold group-hover:text-foreground transition-colors">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Interactive Call-to-Action */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            className="glass-card p-10 rounded-xl border-2 border-border/50 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5"></div>
            <div className="relative z-10">
              <motion.p
                className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                Our platform provides <span className="font-bold text-cyan-400">real-time market insights</span> with data updated daily at 5 PM. 
                The system integrates seamlessly with real data sources such as <span className="font-bold text-purple-400">Alpha Vantage</span> and 
                <span className="font-bold text-pink-400"> FRED APIs</span>, providing accurate and up-to-date capital flow visualizations 
                for investors and financial professionals.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 1.0 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button
                  size="lg"
                  onClick={() => navigate("/industry-flow")}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white px-10 py-7 text-lg shadow-2xl hover:shadow-cyan-500/50 transition-all transform hover:scale-105"
                >
                  Explore Industry Flow
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/global-markets")}
                  className="px-10 py-7 text-lg border-2 hover:bg-foreground/5 transition-all transform hover:scale-105"
                >
                  View Global Markets
                  <Globe className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
