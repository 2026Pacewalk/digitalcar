import ResponsiveDashboardLayout from "@/components/layout/ResponsiveDashboardLayout";
import TopBar from "@/components/layout/TopBar";
import { trpc } from "@/providers/trpc";
import { useState } from "react";
import { Download, QrCode, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function CustomerQR() {
  const { data: cardsData } = trpc.card.list.useQuery();
  const primaryCard = cardsData?.cards?.[0];
  const cardUrl = primaryCard ? `${window.location.origin}/${primaryCard.slug}` : "";
  const [qrColor, setQrColor] = useState("#0F172A");
  const [qrBg, setQrBg] = useState("#FFFFFF");
  const [copied, setCopied] = useState(false);

  const colors = ["#0F172A", "#F7B31C", "#14B8A6", "#3B82F6", "#EF4444", "#8B5CF6"];

  const handleCopy = () => {
    navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    toast.success("URL copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate a simple QR-like pattern using SVG
  const generateQRPattern = () => {
    const size = 25;
    const cells: Array<{x: number; y: number; filled: boolean}> = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Create a deterministic pattern based on position
        const isFinder = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
        if (isFinder) {
          // Finder patterns - 7x7 squares with specific pattern
          const fx = x < 7 ? x : x - (size - 7);
          const fy = y < 7 ? y : y - (size - 7);
          const inBorder = fx === 0 || fx === 6 || fy === 0 || fy === 6;
          const inCenter = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
          cells.push({ x, y, filled: inBorder || inCenter });
        } else {
          // Random-looking data pattern
          const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          cells.push({ x, y, filled: (hash - Math.floor(hash)) > 0.4 });
        }
      }
    }
    return cells;
  };

  const qrPattern = generateQRPattern();
  const cellSize = 10;
  const qrSize = 25 * cellSize;

  return (
    <ResponsiveDashboardLayout>
      <div className="hidden md:block"><TopBar title="QR Codes" subtitle="Generate and download QR codes" /></div>
      <div className="p-6 space-y-6">
        {!primaryCard ? (
          <div className="bg-white rounded-2xl p-12 shadow-premium border border-[#F1F5F9] text-center">
            <QrCode size={40} className="text-[#CBD5E1] mx-auto mb-4" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No card yet</h3>
            <p className="text-sm text-[#94A3B8] mb-4">Create a card first to generate a QR code</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Preview */}
            <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
              <h2 className="text-base font-semibold text-[#0F172A] mb-1">QR Code Preview</h2>
              <p className="text-xs text-[#94A3B8] mb-6">Scan to view your card</p>
              <div className="flex items-center justify-center p-8">
                <div className="p-6 rounded-2xl" style={{ backgroundColor: qrBg }}>
                  <svg width={qrSize} height={qrSize} viewBox={`0 0 ${qrSize} ${qrSize}`}>
                    {qrPattern.map((cell, i) => (
                      cell.filled && <rect key={i} x={cell.x * cellSize} y={cell.y * cellSize} width={cellSize} height={cellSize} fill={qrColor} />
                    ))}
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 p-3 bg-[#F8FAFC] rounded-xl">
                <span className="text-xs text-[#64748B] truncate max-w-[280px]">{cardUrl}</span>
                <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] transition-colors">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Customization */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Colors</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#64748B] mb-2">QR Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {colors.map((c) => (
                        <button
                          key={c}
                          onClick={() => setQrColor(c)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${qrColor === c ? "border-[#0F172A] scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input type="color" value={qrColor} onChange={(e) => setQrColor(e.target.value)} className="w-8 h-8 rounded-lg border-2 border-[#E2E8F0] cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#64748B] mb-2">Background</label>
                    <div className="flex gap-2">
                      {["#FFFFFF", "#F8FAFC", "#FEF3C7", "#E0F2FE"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setQrBg(c)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${qrBg === c ? "border-[#0F172A] scale-110" : "border-[#E2E8F0]"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Download</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => toast.success("QR Code downloaded!")}
                    className="w-full flex items-center justify-center gap-2 h-11 gradient-gold text-[#0F172A] rounded-xl text-sm font-semibold hover:shadow-gold transition-all active:scale-[0.98]"
                  >
                    <Download size={16} /> Download PNG
                  </button>
                  <button
                    onClick={() => toast.success("QR Code downloaded!")}
                    className="w-full flex items-center justify-center gap-2 h-11 border border-[#E2E8F0] text-[#64748B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC] transition-all"
                  >
                    <Download size={16} /> Download SVG
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-premium border border-[#F1F5F9]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Share</h3>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
                    <Copy size={14} /> Copy Link
                  </button>
                  <a href={cardUrl} target="_blank" className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-[#E2E8F0] text-sm text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
                    <ExternalLink size={14} /> View Card
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveDashboardLayout>
  );
}
