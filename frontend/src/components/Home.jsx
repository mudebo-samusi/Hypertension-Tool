import React from "react";
import { motion } from "framer-motion";
import { FaHeartbeat, FaMobile, FaUserMd, FaChartLine } from "react-icons/fa";
import logoMayo from "../assets/logo-mayo.png";
import logoCleveland from "../assets/logo-cleveland.png";
import logoJohns from "../assets/logo-johns.png";
import logoMGH from "../assets/logo-mgh.png";
import logoUICT from "../assets/logo-uict.png"
import logoPulsePal from "../assets/logo1.png"
import logo1 from "../assets/logo2.png"

const Home = () => {
  const features = [
    { icon: <FaHeartbeat />, title: "24/7 Monitoring", desc: "Comprehensive solution for better health management." },
    { icon: <FaMobile />, title: "Mobile Access", desc: "Track your readings anytime, anywhere." },
    { icon: <FaUserMd />, title: "Expert Support", desc: "Connect with healthcare professionals 24/7." },
    { icon: <FaChartLine />, title: "AI Analysis", desc: "Deep insights powered by advanced algorithms." }
  ];

  const howItWorks = [
    { icon: <FaMobile />, title: "Connect Your Device", desc: "Sync your blood pressure monitor with PulsePal instantly." },
    { icon: <FaChartLine />, title: "Receive AI Insights", desc: "Our AI analyzes your readings and highlights trends." },
    { icon: <FaUserMd />, title: "Consult Professionals", desc: "Get personalized advice from certified doctors." }
  ];

  const partners = [logoMayo, logoCleveland, logoJohns, logoMGH, logoUICT, logoPulsePal];

  return (
    <div className="bg-white">

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto text-center">
        <img src={logo1} alt="Logo" className="rounded-sm w-56 h-50 mb-8 mx-auto" ></img>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-violet-600 mb-6">
            Remote Hypertension Monitoring Made Simple
          </h1>
          <p className="text-xl pt-6 text-gray-900 mb-8 text-balance max-w-3xl mx-auto">
            PulsePal helps you monitor and manage hypertension with AI-powered insights,
            real-time tracking, and professional medical support.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <button className="bg-violet-600 text-white px-8 py-3 rounded-lg hover:bg-violet-700 transition">
              Get Started
            </button>
            <button className="border-2 border-violet-600 text-violet-600 px-8 py-3 rounded-lg hover:bg-violet-50 transition">
              Book a Demo
            </button>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Why Choose PulsePal?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05 }}
                className="p-6 bg-violet-600 rounded-xl text-center"
              >
                <div className="text-4xl text-gray-100 mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-100">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-violet-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-white p-6 rounded-xl shadow-lg text-center"
              >
                <div className="text-4xl text-violet-600 mb-4 flex justify-center">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((id) => (
              <motion.div
                key={id}
                whileHover={{ y: -10 }}
                className="bg-gray-50 p-6 rounded-xl shadow-lg"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-violet-200 rounded-full"></div>
                  <div className="ml-4">
                    <h4 className="font-semibold">John Doe</h4>
                    <p className="text-gray-600">Patient</p>
                  </div>
                </div>
                <p className="text-gray-900 font-normal text-balance ">
                  "PulsePal has transformed how I manage my hypertension. The
                  real-time monitoring and AI insights are game-changers."
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-violet-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-8">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied users who have transformed their
            hypertension management with PulsePal.
          </p>
          <button className="bg-white text-violet-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition">
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">Trusted By</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-70">
            {partners.map((logo, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="h-20 flex items-center justify-center"
              >
                <img src={logo} alt="Partner Logo" className="max-h-full object-contain" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
