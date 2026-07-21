import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Eye,
  Save,
  Smartphone,
  Monitor,
  Plus,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings as SettingsIcon,
  User,
  Image,
  Phone,
  FileText,
  Briefcase,
  ShoppingBag,
  Grid3X3,
  Play,
  FileDown,
  QrCode,
  Share2,
  Link,
  Clock,
  MapPin,
  Star,
  MessageSquare,
  MessageCircle,
  Code,
  X,
} from "lucide-react";
import { toast } from "sonner";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  User, Image, Phone, FileText, Briefcase, ShoppingBag, Grid3X3, Play, FileDown,
  QrCode, Share2, Link, Clock, MapPin, Star, MessageSquare, MessageCircle, Code,
};

const categories = ["All", "Header", "Contact", "Content", "Media", "Business", "Social", "Advanced"];

export default function CardBuilder() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [cardTitle, setCardTitle] = useState("My Digital Card");
  const [blockSearch, setBlockSearch] = useState("");

  // Create a default card if none exists
  const { data: cardsData } = trpc.card.list.useQuery();
  const currentCardId = cardId ? parseInt(cardId) : cardsData?.cards?.[0]?.id;

  const { data: card, refetch: refetchCard } = trpc.card.getById.useQuery(
    { id: currentCardId! },
    { enabled: !!currentCardId }
  );
  const { data: blockTypes } = trpc.block.listTypes.useQuery();
  const utils = trpc.useUtils();

  const createCardMutation = trpc.card.create.useMutation({
    onSuccess: (data) => {
      toast.success("Card created!");
      navigate(`/dashboard/builder/${data.id}`);
    },
  });

  const createBlockMutation = trpc.block.create.useMutation({
    onSuccess: () => {
      refetchCard();
      toast.success("Block added!");
    },
  });

  const updateBlockMutation = trpc.block.update.useMutation({
    onSuccess: () => {
      refetchCard();
    },
  });

  const deleteBlockMutation = trpc.block.delete.useMutation({
    onSuccess: () => {
      refetchCard();
      setSelectedBlock(null);
      setShowSettings(false);
      toast.success("Block removed!");
    },
  });

  const publishMutation = trpc.card.publish.useMutation({
    onSuccess: () => {
      refetchCard();
      toast.success("Card published!");
    },
  });

  const updateCardMutation = trpc.card.update.useMutation({
    onSuccess: () => {
      refetchCard();
      toast.success("Card saved!");
    },
  });

  useEffect(() => {
    if (card) setCardTitle(card.title);
  }, [card]);

  const handleAddBlock = (type: string) => {
    if (!currentCardId) {
      // Create card first
      createCardMutation.mutate({
        title: cardTitle,
        slug: `${user?.fullName?.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      });
      return;
    }
    const position = card?.blocks?.length || 0;
    createBlockMutation.mutate({
      cardId: currentCardId,
      type,
      position,
      content: getDefaultBlockContent(type),
      config: { style: "default" },
    });
  };

  const handleDeleteBlock = (id: number) => {
    deleteBlockMutation.mutate({ id });
  };

  const handleUpdateBlockContent = (blockId: number, content: Record<string, unknown>) => {
    updateBlockMutation.mutate({ id: blockId, content });
  };

  const handlePublish = () => {
    if (currentCardId) publishMutation.mutate({ id: currentCardId });
  };

  const handleSaveTitle = () => {
    if (currentCardId) updateCardMutation.mutate({ id: currentCardId, title: cardTitle });
  };

  const selectedBlockData = card?.blocks?.find((b: { id: number }) => b.id === selectedBlock);

  const filteredBlocks = blockTypes?.filter((b: { name: string; category: string }) => {
    const matchesCategory = selectedCategory === "All" || b.category === selectedCategory.toLowerCase();
    const matchesSearch = !blockSearch || b.name.toLowerCase().includes(blockSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col">
      {/* Top Builder Bar */}
      <header className="h-14 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg hover:bg-[#F4F4F4]">
            <ArrowLeft size={18} className="text-[#666666]" />
          </button>
          <input
            type="text"
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
            onBlur={handleSaveTitle}
            className="text-sm font-medium text-[#1A1A1A] bg-transparent outline-none border-b border-transparent hover:border-[#E5E5E5] focus:border-[#D4AF37] px-1"
          />
          {card?.status === "published" && (
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium">Published</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-[#F4F4F4] text-[#666666]"><Monitor size={16} /></button>
          <button className="p-2 rounded-lg bg-[#081828] text-white"><Smartphone size={16} /></button>
          {card?.slug && (
            <a href={`/c/${card.slug}`} target="_blank" className="flex items-center gap-2 h-9 px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#666666] hover:bg-[#F4F4F4]">
              <Eye size={14} /> Preview
            </a>
          )}
          <button onClick={handlePublish} className="flex items-center gap-2 h-9 px-4 bg-[#D4AF37] hover:bg-[#B8962F] text-white rounded-lg text-sm font-medium transition-colors">
            <Save size={14} /> Publish
          </button>
        </div>
      </header>

      {/* Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Block Library */}
        <div className="w-[280px] bg-white border-r border-[#E5E5E5] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#E5E5E5]">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Blocks</h3>
            <input
              type="text"
              placeholder="Search blocks..."
              value={blockSearch}
              onChange={(e) => setBlockSearch(e.target.value)}
              className="w-full h-9 bg-[#F4F4F4] rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
            <div className="flex gap-1 mt-3 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedCategory === cat ? "bg-[#D4AF37] text-white" : "bg-[#F4F4F4] text-[#666666] hover:bg-[#E5E5E5]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filteredBlocks?.map((bt: { id: string; name: string; icon: string; description?: string }) => {
              const IconComp = iconMap[bt.icon] || User;
              return (
                <button
                  key={bt.id}
                  onClick={() => handleAddBlock(bt.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#F4F4F4] transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F4F4F4] group-hover:bg-white flex items-center justify-center shrink-0">
                    <IconComp size={16} className="text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{bt.name}</p>
                    {bt.description && <p className="text-xs text-[#999999]">{bt.description}</p>}
                  </div>
                  <Plus size={14} className="text-[#D4AF37] opacity-0 group-hover:opacity-100 ml-auto shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Panel - Mobile Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div className="relative">
            {/* Phone Frame */}
            <div className="w-[375px] h-[750px] bg-[#081828] rounded-[32px] p-3 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#081828] rounded-b-2xl z-10" />
              {/* Screen */}
              <div className="w-full h-full bg-white rounded-[24px] overflow-y-auto">
                {(!card?.blocks || card.blocks.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#F4F4F4] flex items-center justify-center mb-4">
                      <Plus size={24} className="text-[#999999]" />
                    </div>
                    <p className="text-sm text-[#999999] text-center">Click a block from the left panel to add it to your card</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {card.blocks.map((block: { id: number; type: string; content: Record<string, unknown>; config: Record<string, unknown>; isActive: boolean }) => (
                      <div
                        key={block.id}
                        onClick={() => {
                          setSelectedBlock(block.id);
                          setShowSettings(true);
                        }}
                        className={`relative rounded-xl transition-all cursor-pointer ${
                          selectedBlock === block.id ? "ring-2 ring-[#D4AF37]" : "hover:ring-1 hover:ring-[#E5E5E5]"
                        } ${!block.isActive ? "opacity-50" : ""}`}
                      >
                        <BlockPreview type={block.type} content={block.content} />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBlock(block.id);
                            }}
                            className="p-1.5 rounded bg-red-500 text-white shadow-sm"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Settings */}
        {showSettings && selectedBlockData && (
          <div className="w-[320px] bg-white border-l border-[#E5E5E5] flex flex-col shrink-0">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1A1A1A]">Block Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded hover:bg-[#F4F4F4]">
                <X size={16} className="text-[#666666]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <BlockSettings
                type={selectedBlockData.type}
                content={selectedBlockData.content}
                onChange={(content) => handleUpdateBlockContent(selectedBlockData.id, content)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Block Preview Component - renders a preview of each block type
function BlockPreview({ type, content }: { type: string; content: Record<string, unknown> }) {
  switch (type) {
    case "profile_header":
      return (
        <div className="text-center p-4">
          <div className="w-20 h-20 rounded-full bg-[#F4F4F4] mx-auto mb-3 flex items-center justify-center">
            <User size={32} className="text-[#999999]" />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">{(content.name as string) || "Your Name"}</h3>
          <p className="text-sm text-[#666666]">{(content.title as string) || "Job Title"}</p>
          <p className="text-xs text-[#999999]">{(content.company as string) || "Company"}</p>
        </div>
      );
    case "contact_info":
      return (
        <div className="p-4 space-y-2">
          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-2">Contact</h4>
          {content.phone && <p className="text-xs text-[#666666] flex items-center gap-2"><Phone size={12} /> {content.phone as string}</p>}
          {content.email && <p className="text-xs text-[#666666] flex items-center gap-2"><MessageSquare size={12} /> {content.email as string}</p>}
          {!content.phone && !content.email && <p className="text-xs text-[#999999]">Add your contact details</p>}
        </div>
      );
    case "about_us":
      return (
        <div className="p-4">
          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-2">About</h4>
          <p className="text-xs text-[#666666] leading-relaxed">{(content.text as string) || "Tell people about yourself or your business..."}</p>
        </div>
      );
    case "services":
      return (
        <div className="p-4">
          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-2">Services</h4>
          <div className="grid grid-cols-2 gap-2">
            {((content.items as Array<{name: string}>) || [{name: "Service 1"}, {name: "Service 2"}]).map((s, i) => (
              <div key={i} className="bg-[#F4F4F4] rounded-lg p-2 text-center">
                <p className="text-xs font-medium text-[#1A1A1A]">{s.name}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "social_links":
      return (
        <div className="p-4">
          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-2">Connect</h4>
          <div className="flex justify-center gap-3">
            {["Facebook", "Instagram", "LinkedIn"].map((platform) => (
              <div key={platform} className="w-9 h-9 rounded-full bg-[#F4F4F4] flex items-center justify-center">
                <Share2 size={14} className="text-[#666666]" />
              </div>
            ))}
          </div>
        </div>
      );
    case "whatsapp_button":
      return (
        <div className="p-4">
          <button className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
            <MessageCircle size={16} /> Chat on WhatsApp
          </button>
        </div>
      );
    case "enquiry_form":
      return (
        <div className="p-4">
          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-2">{(content.title as string) || "Get in Touch"}</h4>
          <div className="space-y-2">
            <div className="h-9 bg-[#F4F4F4] rounded-lg" />
            <div className="h-9 bg-[#F4F4F4] rounded-lg" />
            <div className="h-20 bg-[#F4F4F4] rounded-lg" />
            <div className="h-9 bg-[#D4AF37] rounded-lg" />
          </div>
        </div>
      );
    default:
      return (
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F4F4F4] flex items-center justify-center">
            <Grid3X3 size={16} className="text-[#999999]" />
          </div>
          <span className="text-sm text-[#666666] capitalize">{type.replace("_", " ")}</span>
        </div>
      );
  }
}

// Block Settings Component - renders the settings form for each block type
function BlockSettings({ type, content, onChange }: {
  type: string;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const updateField = (field: string, value: unknown) => {
    onChange({ ...content, [field]: value });
  };

  switch (type) {
    case "profile_header":
      return (
        <div className="space-y-4">
          <SettingInput label="Name" value={(content.name as string) || ""} onChange={(v) => updateField("name", v)} />
          <SettingInput label="Title" value={(content.title as string) || ""} onChange={(v) => updateField("title", v)} />
          <SettingInput label="Company" value={(content.company as string) || ""} onChange={(v) => updateField("company", v)} />
          <SettingTextarea label="Bio" value={(content.bio as string) || ""} onChange={(v) => updateField("bio", v)} />
        </div>
      );
    case "contact_info":
      return (
        <div className="space-y-4">
          <SettingInput label="Phone" value={(content.phone as string) || ""} onChange={(v) => updateField("phone", v)} />
          <SettingInput label="Email" value={(content.email as string) || ""} onChange={(v) => updateField("email", v)} />
          <SettingInput label="Address" value={(content.address as string) || ""} onChange={(v) => updateField("address", v)} />
          <SettingInput label="Website" value={(content.website as string) || ""} onChange={(v) => updateField("website", v)} />
        </div>
      );
    case "about_us":
      return (
        <div className="space-y-4">
          <SettingTextarea label="About Text" value={(content.text as string) || ""} onChange={(v) => updateField("text", v)} rows={6} />
        </div>
      );
    case "whatsapp_button":
      return (
        <div className="space-y-4">
          <SettingInput label="Phone Number" value={(content.phone as string) || ""} onChange={(v) => updateField("phone", v)} placeholder="+1234567890" />
          <SettingInput label="Pre-filled Message" value={(content.message as string) || ""} onChange={(v) => updateField("message", v)} />
        </div>
      );
    case "enquiry_form":
      return (
        <div className="space-y-4">
          <SettingInput label="Form Title" value={(content.title as string) || ""} onChange={(v) => updateField("title", v)} />
        </div>
      );
    default:
      return (
        <div className="text-center py-8">
          <SettingsIcon size={24} className="text-[#999999] mx-auto mb-2" />
          <p className="text-sm text-[#999999]">Settings for {type.replace("_", " ")}</p>
        </div>
      );
  }
}

function SettingInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#1A1A1A] mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 bg-[#F4F4F4] rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]"
      />
    </div>
  );
}

function SettingTextarea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#1A1A1A] mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-[#F4F4F4] rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37] resize-none"
      />
    </div>
  );
}

function getDefaultBlockContent(type: string): Record<string, unknown> {
  switch (type) {
    case "profile_header": return { name: "", title: "", company: "", bio: "" };
    case "contact_info": return { phone: "", email: "", address: "", website: "" };
    case "about_us": return { text: "" };
    case "services": return { items: [] };
    case "products": return { items: [] };
    case "gallery": return { images: [] };
    case "video": return { url: "" };
    case "social_links": return { links: [] };
    case "whatsapp_button": return { phone: "", message: "Hi, I found your card!" };
    case "enquiry_form": return { title: "Get in Touch" };
    case "map": return { address: "" };
    case "business_hours": return { hours: [] };
    case "testimonials": return { items: [] };
    case "payment_qr": return { paymentApp: "", upiId: "" };
    default: return {};
  }
}
