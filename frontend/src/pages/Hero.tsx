import { motion } from "framer-motion";
import { ArrowRight, Globe, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

export default function Hero() {
  const navigate = useNavigate();
  const aboutSectionRef = useRef<HTMLDivElement>(null);

  const scrollToAbout = () => {
    // Scroll less - only scroll down by a viewport height minus some offset
    window.scrollTo({ 
      behavior: "smooth", 
      top: window.innerHeight * 0.7 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="min-h-[85vh] flex items-start justify-center pt-24 pb-12">
        <div className="container mx-auto px-4">
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
              className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
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

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex justify-center"
            >
              <button
                onClick={scrollToAbout}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer animate-bounce"
                aria-label="Scroll down"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* About Section */}
      <div ref={aboutSectionRef} className="container mx-auto px-4 pt-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            About Money Flow Observatory
          </motion.h2>

          {/* Interactive Introduction Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="glass-card p-6 rounded-lg border border-border/50 hover:border-cyan-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">💸</span>
                </div>
                <h3 className="text-xl font-semibold group-hover:text-cyan-400 transition-colors">
                  Real-Time Insights
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Money Flow Observatory is a cutting-edge platform that provides <span className="font-semibold text-foreground">real-time insights</span> into 
                capital movements across global financial markets. Our mission is to help investors, 
                analysts, and financial professionals understand how money flows between different asset 
                classes and economies.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="glass-card p-6 rounded-lg border border-border/50 hover:border-purple-500/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold group-hover:text-purple-400 transition-colors">
                  Dynamic Visualization
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We track five key asset classes—<span className="font-semibold text-cyan-400">Stocks</span>, <span className="font-semibold text-purple-400">Bonds</span>, 
                <span className="font-semibold text-pink-400"> Commodities</span>, <span className="font-semibold text-yellow-400">Crypto</span>, and <span className="font-semibold text-green-400">Cash</span>—and 
                visualize their relationships through dynamic network graphs.
              </p>
            </motion.div>
          </div>

          {/* Interactive Asset Classes Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass-card p-8 rounded-lg border border-border/50 mb-8"
          >
            <h3 className="text-xl font-semibold mb-6 text-center">Track Five Key Asset Classes</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: "Stocks", colorClass: "text-cyan-400", hoverColorClass: "group-hover:text-cyan-300", emoji: "📈" },
                { name: "Bonds", colorClass: "text-purple-400", hoverColorClass: "group-hover:text-purple-300", emoji: "📉" },
                { name: "Commodities", colorClass: "text-pink-400", hoverColorClass: "group-hover:text-pink-300", emoji: "⛽" },
                { name: "Crypto", colorClass: "text-yellow-400", hoverColorClass: "group-hover:text-yellow-300", emoji: "₿" },
                { name: "Cash", colorClass: "text-green-400", hoverColorClass: "group-hover:text-green-300", emoji: "💵" }
              ].map((asset, index) => (
                <motion.div
                  key={asset.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  className="text-center p-4 rounded-lg border border-border/30 hover:border-cyan-500/50 transition-all cursor-pointer group"
                >
                  <div className="text-4xl mb-2 group-hover:scale-125 transition-transform">
                    {asset.emoji}
                  </div>
                  <div className={`font-semibold ${asset.colorClass} ${asset.hoverColorClass} transition-colors`}>
                    {asset.name}
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-muted-foreground mt-6">
              Each node's size reflects net capital inflows or outflows, while edges illustrate correlations and flow intensity between assets.
            </p>
          </motion.div>

          {/* Interactive Feature Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <h3 className="text-2xl font-semibold mb-6 text-center bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Key Features
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: "🌊",
                  title: "Real-Time Visualization",
                  description: "Dynamic node sizes based on net inflows/outflows",
                  colorClass: "text-cyan-400",
                  hoverColorClass: "group-hover:text-cyan-300",
                  gradient: "from-cyan-500 to-blue-600"
                },
                {
                  icon: "🔗",
                  title: "Correlation Analysis",
                  description: "Identify diversification opportunities between asset pairs",
                  colorClass: "text-purple-400",
                  hoverColorClass: "group-hover:text-purple-300",
                  gradient: "from-purple-500 to-pink-600"
                },
                {
                  icon: "⚡",
                  title: "Flow Intensity Metrics",
                  description: "Combine correlation strength with normalized capital flows",
                  colorClass: "text-pink-400",
                  hoverColorClass: "group-hover:text-pink-300",
                  gradient: "from-pink-500 to-rose-600"
                },
                {
                  icon: "🌍",
                  title: "Global Market Tracking",
                  description: "Monitor flows across major economies and regions",
                  colorClass: "text-cyan-400",
                  hoverColorClass: "group-hover:text-cyan-300",
                  gradient: "from-cyan-500 to-teal-600"
                },
                {
                  icon: "📱",
                  title: "Interactive Graphs",
                  description: "Real-time updates with market movements",
                  colorClass: "text-purple-400",
                  hoverColorClass: "group-hover:text-purple-300",
                  gradient: "from-purple-500 to-indigo-600"
                },
                {
                  icon: "🚀",
                  title: "API Ready",
                  description: "Seamless integration with Alpha Vantage, FRED, and Binance",
                  colorClass: "text-pink-400",
                  hoverColorClass: "group-hover:text-pink-300",
                  gradient: "from-pink-500 to-orange-600"
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -8, rotate: 1 }}
                  className="glass-card p-5 rounded-lg border border-border/50 hover:border-cyan-500/50 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                  <div className="relative z-10">
                    <div className="text-4xl mb-3 group-hover:scale-125 group-hover:rotate-12 transition-transform inline-block">
                      {feature.icon}
                    </div>
                    <h4 className={`font-semibold mb-2 ${feature.colorClass} ${feature.hoverColorClass} transition-colors`}>
                      {feature.title}
                    </h4>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Interactive Call-to-Action */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            className="glass-card p-8 rounded-lg border border-border/50 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 text-center"
          >
            <motion.p
              className="text-lg text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Our platform simulates <span className="font-semibold text-cyan-400">live market movement</span> by recalculating all values on every request, 
              providing a realistic view of capital flows. The system is designed to integrate seamlessly 
              with real data sources such as <span className="font-semibold text-purple-400">Alpha Vantage</span>, <span className="font-semibold text-pink-400">FRED</span>, and <span className="font-semibold text-yellow-400">Binance APIs</span>, 
              making it ready for production use with actual market data.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Button
                size="lg"
                onClick={() => navigate("/industry-flow")}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Start Exploring
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
