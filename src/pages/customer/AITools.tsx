import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { useState } from "react";
import { Sparkles, Wand2, FileText, Image, MessageSquare, Send, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const tools = [
  { id: "bio", name: "Bio Writer", description: "Generate a professional bio", icon: FileText, placeholder: "Describe yourself briefly..." },
  { id: "headline", name: "Headline Generator", description: "Create catchy headlines", icon: Sparkles, placeholder: "Your role or business..." },
  { id: "about", name: "About Section", description: "Write an about section", icon: FileText, placeholder: "What do you do?" },
  { id: "services", name: "Service Descriptions", description: "Describe your services", icon: Wand2, placeholder: "List your services..." },
];

export default function AITools() {
  const [activeTool, setActiveTool] = useState("bio");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const tool = tools.find((t) => t.id === activeTool) || tools[0];

  const handleGenerate = () => {
    if (!input.trim()) { toast.error("Please enter some details"); return; }
    setLoading(true);
    setTimeout(() => {
      const responses: Record<string, string> = {
        bio: `Experienced professional with a passion for delivering exceptional results. With expertise in ${input}, I help businesses grow and achieve their goals. Let's connect and explore how we can work together.`,
        headline: `${input} | Driving Innovation & Delivering Results | Let's Connect`,
        about: `Welcome! I specialize in ${input}. With years of experience and a commitment to excellence, I provide tailored solutions that meet your unique needs. My approach combines creativity with strategic thinking to deliver outcomes that exceed expectations.`,
        services: `Our ${input} services include: Strategic consulting and planning, Implementation and execution, Ongoing support and optimization, Performance tracking and reporting. Contact us to learn more about how we can help.`,
      };
      setOutput(responses[activeTool] || "Here's your AI-generated content based on your input.");
      setLoading(false);
      toast.success("Content generated!");
    }, 1500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="AI Tools" subtitle="Generate content with AI" /></div>
      <div className="p-6 space-y-6">
        {/* Tool Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTool(t.id); setOutput(""); }}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                activeTool === t.id ? "border-[#F7B31C] bg-[#FEF3C7]/30" : "border-[#F1F5F9] bg-white hover:border-[#E2E8F0]"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${activeTool === t.id ? "bg-[#FEF3C7]" : "bg-[#F1F5F9]"}`}>
                <t.icon size={18} className={activeTool === t.id ? "text-[#F7B31C]" : "text-[#64748B]"} />
              </div>
              <p className="text-sm font-semibold text-[#0F172A]">{t.name}</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-1">{tool.name}</h3>
            <p className="text-xs text-[#94A3B8] mb-4">{tool.description}</p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tool.placeholder}
              rows={8}
              className="w-full bg-[#F8FAFC] rounded-xl p-4 text-sm outline-none border border-[#E2E8F0] focus:border-[#F7B31C] focus:ring-2 focus:ring-[#F7B31C]/20 resize-none transition-all placeholder:text-[#94A3B8]"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full mt-4 h-12 gradient-gold text-[#0F172A] rounded-xl font-semibold text-sm transition-all hover:shadow-gold active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? "Generating..." : "Generate Content"}
            </button>
          </div>

          {/* Output */}
          <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#0F172A]">Result</h3>
              {output && (
                <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#F7B31C] transition-colors">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              )}
            </div>
            {output ? (
              <div className="bg-[#F8FAFC] rounded-xl p-4">
                <p className="text-sm text-[#0F172A] leading-relaxed whitespace-pre-wrap">{output}</p>
              </div>
            ) : (
              <div className="bg-[#F8FAFC] rounded-xl p-8 text-center">
                <Sparkles size={24} className="text-[#CBD5E1] mx-auto mb-2" />
                <p className="text-sm text-[#94A3B8]">Your AI-generated content will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ResponsiveDashboardLayout>
  );
}
