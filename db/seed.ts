import { getDb } from "../api/queries/connection";
import { users, subscriptionPackages, templates, resellerProfiles } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // ─── Seed Super Admin ───
  const adminPass = await bcrypt.hash("admin123", 12);
  const [adminResult] = await db.insert(users).values({
    email: "admin@digitalcarda.com",
    password: adminPass,
    fullName: "Super Admin",
    role: "super_admin",
    status: "active",
  }).onDuplicateKeyUpdate({ set: { email: "admin@digitalcarda.com" } });
  console.log("Super admin seeded: admin@digitalcarda.com / admin123");

  // ─── Seed Customer Demo ───
  const customerPass = await bcrypt.hash("demo123", 12);
  const [customerResult] = await db.insert(users).values({
    email: "demo@digitalcarda.com",
    password: customerPass,
    fullName: "Demo Customer",
    role: "customer",
    status: "active",
    phone: "+91 98765 43210",
  }).onDuplicateKeyUpdate({ set: { email: "demo@digitalcarda.com" } });
  const customerId = customerResult.insertId;
  if (customerId) {
    console.log("Customer seeded: demo@digitalcarda.com / demo123");
  }

  // ─── Seed Reseller Demo ───
  const resellerPass = await bcrypt.hash("reseller123", 12);
  const [resellerResult] = await db.insert(users).values({
    email: "reseller@digitalcarda.com",
    password: resellerPass,
    fullName: "Demo Reseller",
    role: "reseller",
    status: "active",
    phone: "+91 98765 43211",
  }).onDuplicateKeyUpdate({ set: { email: "reseller@digitalcarda.com" } });
  const resellerId = resellerResult.insertId;

  // Create reseller profile
  if (resellerId) {
    await db.insert(resellerProfiles).values({
      userId: Number(resellerId),
      companyName: "Demo Agency Pvt Ltd",
      commissionRate: "20.00",
      totalCustomers: 5,
      status: "active",
    }).onDuplicateKeyUpdate({ set: { companyName: "Demo Agency Pvt Ltd" } });
    console.log("Reseller seeded: reseller@digitalcarda.com / reseller123");
  }

  // ─── Seed Subscription Packages ───
  const packages = [
    {
      name: "Starter", slug: "starter",
      description: "Perfect for individuals starting out with digital business cards.",
      monthlyPrice: "9.99", yearlyPrice: "99.99", trialDays: 7,
      maxCards: 1, maxProducts: 3, maxGalleryImages: 5, maxVideos: 0,
      storageLimitMB: 100,
      featureCustomDomain: false, featureSEO: true, featureAnalytics: false,
      featureLeadCapture: false, featureRemoveBranding: false, featureWhiteLabel: false,
      featurePrioritySupport: false, featureAI: false, featureMultilingual: false, featureCRM: false,
      isActive: true, displayOrder: 1,
    },
    {
      name: "Professional", slug: "professional",
      description: "Best for professionals who want full analytics and lead capture.",
      monthlyPrice: "19.99", yearlyPrice: "199.99", trialDays: 7,
      maxCards: 3, maxProducts: 10, maxGalleryImages: 20, maxVideos: 3,
      storageLimitMB: 500,
      featureCustomDomain: true, featureSEO: true, featureAnalytics: true,
      featureLeadCapture: true, featureRemoveBranding: false, featureWhiteLabel: false,
      featurePrioritySupport: false, featureAI: true, featureMultilingual: false, featureCRM: false,
      isActive: true, displayOrder: 2,
    },
    {
      name: "Business", slug: "business",
      description: "Complete solution for businesses with white-label and CRM.",
      monthlyPrice: "49.99", yearlyPrice: "499.99", trialDays: 7,
      maxCards: 10, maxProducts: 50, maxGalleryImages: 100, maxVideos: 10,
      storageLimitMB: 2000,
      featureCustomDomain: true, featureSEO: true, featureAnalytics: true,
      featureLeadCapture: true, featureRemoveBranding: true, featureWhiteLabel: true,
      featurePrioritySupport: true, featureAI: true, featureMultilingual: true, featureCRM: true,
      isActive: true, displayOrder: 3,
    },
    {
      name: "Agency", slug: "agency",
      description: "For agencies and resellers managing multiple clients.",
      monthlyPrice: "99.99", yearlyPrice: "999.99", trialDays: 7,
      maxCards: 100, maxProducts: 500, maxGalleryImages: 1000, maxVideos: 50,
      storageLimitMB: 10000,
      featureCustomDomain: true, featureSEO: true, featureAnalytics: true,
      featureLeadCapture: true, featureRemoveBranding: true, featureWhiteLabel: true,
      featurePrioritySupport: true, featureAI: true, featureMultilingual: true, featureCRM: true,
      isActive: true, displayOrder: 4,
    },
  ];

  for (const pkg of packages) {
    await db.insert(subscriptionPackages).values(pkg).onDuplicateKeyUpdate({
      set: { name: pkg.name },
    });
  }
  console.log("Subscription packages seeded");

  // ─── Seed Templates ───
  const templateData = [
    { name: "Classic Professional", slug: "classic-professional", category: "professional", description: "Clean, timeless design for corporate professionals.", minPackage: "starter" },
    { name: "Modern Minimal", slug: "modern-minimal", category: "minimal", description: "Stripped-down elegance with focus on content.", minPackage: "starter" },
    { name: "Creative Bold", slug: "creative-bold", category: "creative", description: "Vibrant, eye-catching design for creatives.", minPackage: "starter" },
    { name: "Executive Dark", slug: "executive-dark", category: "professional", description: "Sophisticated dark theme for senior executives.", minPackage: "professional" },
    { name: "Restaurant", slug: "restaurant", category: "restaurant", description: "Designed for restaurants and food businesses.", minPackage: "professional" },
    { name: "Real Estate", slug: "real-estate", category: "real-estate", description: "Showcase properties with this premium template.", minPackage: "professional" },
    { name: "Healthcare", slug: "healthcare", category: "healthcare", description: "Trustworthy design for medical professionals.", minPackage: "starter" },
    { name: "Tech Startup", slug: "tech-startup", category: "creative", description: "Modern design perfect for tech professionals.", minPackage: "starter" },
  ];

  for (let i = 0; i < templateData.length; i++) {
    const t = templateData[i];
    await db.insert(templates).values({
      ...t, displayOrder: i, isActive: true,
    }).onDuplicateKeyUpdate({ set: { name: t.name } });
  }
  console.log("Templates seeded");

  console.log("\n===== DEMO CREDENTIALS =====");
  console.log("Admin:    admin@digitalcarda.com    / admin123");
  console.log("Customer: demo@digitalcarda.com     / demo123");
  console.log("Reseller: reseller@digitalcarda.com / reseller123");
  console.log("===========================\n");
  console.log("Seeding complete!");
}

seed().catch(console.error);
