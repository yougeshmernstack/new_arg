import type { Category, Package, Product, Testimonial } from "@/types/commerce";

export const categories: Category[] = [
  {
    name: "Wellness Juices",
    description: "Cold-pressed health juices made with real fruits, berries, and superfoods.",
    image: "Juice",
    itemCount: 9
  },
  {
    name: "Superfood Powders",
    description: "Greens and superfood powders with wheatgrass, spirulina, moringa, and chlorella.",
    image: "Powder",
    itemCount: 1
  },
  {
    name: "Plant Proteins",
    description: "Plant-based protein blends for daily nutrition and recovery.",
    image: "Protein",
    itemCount: 1
  },
  {
    name: "Wellness Gummies",
    description: "Mixed berry gummies for immunity and natural energy support.",
    image: "Gummy",
    itemCount: 1
  },
  {
    name: "Wellness Supplements",
    description: "Plant-based multivitamins and daily wellness essentials.",
    image: "Vita",
    itemCount: 1
  },
  {
    name: "Herbal Teas",
    description: "Wellness herbal teas crafted for detox, balance, and daily calm.",
    image: "Tea",
    itemCount: 1
  },
  {
    name: "Packages",
    description: "Ready wellness bundles with juices, powders, and gummies.",
    image: "Box",
    itemCount: 4
  }
];

export const products: Product[] = [
  {
    slug: "berry-immunity",
    name: "Berry Immunity Juice",
    category: "Wellness Juices",
    description: "Immunity-focused berry juice with beetroot, blueberry, pomegranate, and raspberry.",
    longDescription:
      "Berry Immunity is a cold-pressed wellness juice crafted to support everyday immunity with real fruits and superfoods. Made without artificial colors, preservatives, or added sugar.",
    price: 399,
    compareAtPrice: 449,
    rating: 4.9,
    reviews: 142,
    image: "/images/products/berry-immunity.svg",
    badge: "Immunity",
    status: "available",
    packSize: "500 ml bottle",
    benefits: ["Supports immunity", "Antioxidant-rich berry blend", "Cold-pressed for maximum nutrition"],
    ingredients: ["Beetroot", "Blueberry", "Pomegranate", "Raspberry", "Purified water"],
    usage: "Consume one serving daily. Shake well before use and refrigerate after opening.",
    tags: ["berry immunity", "cold pressed", "immunity juice"]
  },
  {
    slug: "detox-cleanse",
    name: "Detox & Cleanse Juice",
    category: "Wellness Juices",
    description: "Green detox juice with kale, cucumber, apple, and spinach for daily cleansing.",
    longDescription:
      "Detox & Cleanse is a plant-powered green juice designed to support detoxification, digestion, and daily wellness with clean, natural ingredients.",
    price: 379,
    compareAtPrice: 429,
    rating: 4.8,
    reviews: 118,
    image: "/images/products/detox-cleanse.svg",
    badge: "Detox",
    status: "available",
    packSize: "500 ml bottle",
    benefits: ["Supports detox and cleanse", "Green vegetable nutrition", "Easy daily wellness routine"],
    ingredients: ["Kale", "Cucumber", "Apple", "Spinach", "Purified water"],
    usage: "Best consumed in the morning on an empty stomach or as part of a balanced routine.",
    tags: ["detox", "green juice", "cleanse"]
  },
  {
    slug: "radiant-glow",
    name: "Radiant Glow Juice",
    category: "Wellness Juices",
    description: "Glow-focused juice with strawberry, pomegranate, and acerola for skin wellness.",
    longDescription:
      "Radiant Glow combines antioxidant-rich berries and acerola to support glowing skin and everyday vitality in a refreshing cold-pressed format.",
    price: 389,
    compareAtPrice: 439,
    rating: 4.8,
    reviews: 96,
    image: "/images/products/radiant-glow.svg",
    badge: "Glow",
    status: "available",
    packSize: "500 ml bottle",
    benefits: ["Supports glowing skin", "Berry antioxidant profile", "Premium wellness positioning"],
    ingredients: ["Strawberry", "Pomegranate", "Acerola", "Purified water"],
    usage: "Drink one serving daily as part of your beauty and wellness routine.",
    tags: ["radiant glow", "skin wellness", "berry juice"]
  },
  {
    slug: "energy-boost",
    name: "Energy Boost Juice",
    category: "Wellness Juices",
    description: "Energizing juice with orange, carrot, ginger, and turmeric for natural vitality.",
    longDescription:
      "Energy Boost delivers a bright citrus and root blend to support natural energy, digestion, and an active lifestyle without artificial stimulants.",
    price: 369,
    compareAtPrice: 419,
    rating: 4.7,
    reviews: 87,
    image: "/images/products/energy-boost.svg",
    badge: "Energy",
    status: "available",
    packSize: "500 ml bottle",
    benefits: ["Natural energy support", "Digestive wellness blend", "Bright citrus profile"],
    ingredients: ["Orange", "Carrot", "Ginger", "Turmeric", "Purified water"],
    usage: "Enjoy in the morning or before activity for a natural energy lift.",
    tags: ["energy boost", "citrus", "ginger turmeric"]
  },
  {
    slug: "antioxidant-power",
    name: "Antioxidant Power Juice",
    category: "Wellness Juices",
    description: "Deep berry antioxidant juice with mixed berries, amla, and blueberry.",
    longDescription:
      "Antioxidant Power is a nutrient-dense berry blend crafted for customers seeking strong antioxidant support and premium superfruit wellness.",
    price: 409,
    compareAtPrice: 459,
    rating: 4.9,
    reviews: 74,
    image: "/images/products/antioxidant-power.svg",
    badge: "Antioxidant",
    status: "available",
    packSize: "500 ml bottle",
    benefits: ["Antioxidant-rich superfruit blend", "Supports overall well-being", "Premium berry positioning"],
    ingredients: ["Mixed berries", "Amla", "Blueberry", "Purified water"],
    usage: "Consume daily as part of an antioxidant-focused wellness routine.",
    tags: ["antioxidant", "amla", "mixed berry"]
  },
  {
    slug: "berry-boost",
    name: "Berry Boost Juice",
    category: "Wellness Juices",
    description: "Pure berry wellness juice for nourishment and everyday refreshment.",
    longDescription:
      "Berry Boost is a signature Arogya Greenlife juice focused on pure berry goodness, real nutrition, and a refreshing daily wellness experience.",
    price: 359,
    rating: 4.7,
    reviews: 63,
    image: "/images/products/berry-boost.svg",
    badge: "Berry Boost",
    status: "available",
    packSize: "500 ml bottle",
    benefits: ["Pure berry nutrition", "Refreshing daily juice", "No added sugar"],
    ingredients: ["Mixed berries", "Purified water", "Natural fruit extracts"],
    usage: "Serve chilled and consume within the recommended period after opening.",
    tags: ["berry boost", "wellness juice", "pure wellness"]
  },
  {
    slug: "citrus-immune",
    name: "Citrus Immune Juice",
    category: "Wellness Juices",
    description: "Citrus-forward immunity juice for daily defense and vitality.",
    longDescription:
      "Citrus Immune combines bright citrus fruits with wellness-focused ingredients to support immunity, hydration, and everyday energy.",
    price: 369,
    rating: 4.8,
    reviews: 58,
    image: "/images/products/citrus-immune.svg",
    badge: "Citrus",
    status: "available",
    packSize: "500 ml bottle",
    benefits: ["Immunity support", "Bright citrus profile", "Hydrating wellness drink"],
    ingredients: ["Orange", "Lemon", "Ginger", "Turmeric", "Purified water"],
    usage: "Best enjoyed chilled in the morning or afternoon.",
    tags: ["citrus immune", "immunity", "citrus juice"]
  },
  {
    slug: "green-glow",
    name: "Green Glow Juice",
    category: "Wellness Juices",
    description: "Green wellness juice for detox, balance, and daily nourishment.",
    longDescription:
      "Green Glow is a clean green juice designed for customers who want plant-based nourishment, detox support, and a premium daily wellness ritual.",
    price: 379,
    rating: 4.8,
    reviews: 52,
    image: "/images/products/green-glow.svg",
    badge: "Green Glow",
    status: "available",
    packSize: "500 ml bottle",
    benefits: ["Daily green nourishment", "Detox support", "Plant-powered wellness"],
    ingredients: ["Spinach", "Cucumber", "Apple", "Celery", "Purified water"],
    usage: "Drink one serving daily as part of a balanced wellness routine.",
    tags: ["green glow", "detox", "green juice"]
  },
  {
    slug: "mixed-berry-immunity",
    name: "Mixed Berry Immunity Juice",
    category: "Wellness Juices",
    description: "Mixed berry immunity juice with a rich antioxidant profile.",
    longDescription:
      "Mixed Berry Immunity blends multiple berries into one cold-pressed juice for customers focused on immunity, antioxidants, and natural wellness.",
    price: 399,
    rating: 4.9,
    reviews: 49,
    image: "/images/products/mixed-berry-immunity.svg",
    badge: "Mixed Berry",
    status: "available",
    packSize: "500 ml bottle",
    benefits: ["Mixed berry immunity blend", "Rich in antioxidants", "Cold-pressed nutrition"],
    ingredients: ["Strawberry", "Blueberry", "Blackberry", "Raspberry", "Purified water"],
    usage: "Shake well and consume daily for best results.",
    tags: ["mixed berry", "immunity juice", "antioxidant"]
  },
  {
    slug: "greens-superfood-powder",
    name: "Greens Superfood Powder",
    category: "Superfood Powders",
    description: "Superfood greens powder with wheatgrass, spirulina, moringa, and chlorella.",
    longDescription:
      "Greens Superfood Powder is a daily nutrition blend for customers who want plant-based superfoods in an easy scoop format.",
    price: 899,
    compareAtPrice: 999,
    rating: 4.8,
    reviews: 67,
    image: "/images/products/greens-superfood-powder.svg",
    badge: "Superfood",
    status: "available",
    packSize: "250 g canister",
    benefits: ["Daily green nutrition", "Superfood ingredient blend", "Easy to mix"],
    ingredients: ["Wheatgrass", "Spirulina", "Moringa", "Chlorella"],
    usage: "Mix one scoop with water or smoothie daily.",
    tags: ["greens powder", "superfood", "daily nutrition"]
  },
  {
    slug: "plant-protein",
    name: "Plant Protein",
    category: "Plant Proteins",
    description: "Chocolate plant protein with pea protein, brown rice protein, and amino acids.",
    longDescription:
      "Plant Protein is a clean plant-based protein option for recovery, daily nutrition, and active wellness lifestyles.",
    price: 1499,
    compareAtPrice: 1699,
    rating: 4.7,
    reviews: 41,
    image: "/images/products/plant-protein.svg",
    badge: "Plant Protein",
    status: "available",
    packSize: "500 g jar",
    benefits: ["Plant-based protein source", "Supports recovery", "Chocolate flavor"],
    ingredients: ["Pea protein", "Brown rice protein", "Amino acids", "Natural cocoa"],
    usage: "Mix one scoop with water or plant milk after workouts or as a snack.",
    tags: ["plant protein", "chocolate", "recovery"]
  },
  {
    slug: "wellness-gummies",
    name: "Wellness Gummies",
    category: "Wellness Gummies",
    description: "Mixed berry gummies for immunity and natural energy support.",
    longDescription:
      "Wellness Gummies offer an easy, tasty way to support immunity and energy with a mixed berry flavor profile.",
    price: 599,
    compareAtPrice: 699,
    rating: 4.8,
    reviews: 55,
    image: "/images/products/wellness-gummies.svg",
    badge: "Gummies",
    status: "available",
    packSize: "60 gummies jar",
    benefits: ["Immunity and energy support", "Mixed berry flavor", "Easy daily wellness"],
    ingredients: ["Mixed berry extract", "Vitamins", "Natural flavors", "Pectin"],
    usage: "Take the recommended serving daily with food.",
    tags: ["wellness gummies", "immunity", "mixed berry"]
  },
  {
    slug: "plant-multivitamin",
    name: "Plant Based Multivitamin",
    category: "Wellness Supplements",
    description: "Plant-based multivitamin for everyday nutrition and wellness balance.",
    longDescription:
      "Plant Based Multivitamin supports daily nutrition with a clean, plant-forward formula designed for modern wellness routines.",
    price: 799,
    rating: 4.6,
    reviews: 38,
    image: "/images/products/plant-multivitamin.svg",
    badge: "Multivitamin",
    status: "available",
    packSize: "60 capsules",
    benefits: ["Daily nutrition support", "Plant-based formula", "Wellness balance"],
    ingredients: ["Plant extracts", "Vitamins", "Minerals", "Natural stabilizers"],
    usage: "Take one capsule daily with a meal or as directed.",
    tags: ["multivitamin", "plant based", "daily wellness"]
  },
  {
    slug: "wellness-herbal-tea",
    name: "Wellness Herbal Tea",
    category: "Herbal Teas",
    description: "Herbal wellness tea blend for detox, calm, and daily balance.",
    longDescription:
      "Wellness Herbal Tea is a soothing herbal blend crafted for customers who want a natural wellness ritual beyond juices and supplements.",
    price: 349,
    rating: 4.7,
    reviews: 44,
    image: "/images/products/wellness-herbal-tea.svg",
    badge: "Herbal Tea",
    status: "available",
    packSize: "100 g jar",
    benefits: ["Detox and calm support", "Natural herbal blend", "Daily wellness ritual"],
    ingredients: ["Green tea", "Tulsi", "Ginger", "Lemon peel", "Natural herbs"],
    usage: "Steep one teaspoon in hot water for 3–5 minutes and enjoy.",
    tags: ["herbal tea", "detox", "wellness tea"]
  }
];

export const packages: Package[] = [
  {
    slug: "wellness-juice-starter",
    name: "Wellness Juice Starter Pack",
    description: "Three-bottle starter pack with Berry Immunity, Detox Cleanse, and Radiant Glow.",
    price: 999,
    compareAtPrice: 1167,
    image: "/images/products/wellness-juice-starter.svg",
    badge: "3 Bottles",
    includes: ["Berry Immunity Juice", "Detox & Cleanse Juice", "Radiant Glow Juice"],
    benefits: ["Intro wellness trio", "Immunity, detox, and glow support", "Value starter pricing"],
    idealFor: "Customers starting their Arogya Greenlife wellness journey.",
    duration: "3 bottle starter",
    rating: 4.9,
    reviews: 76
  },
  {
    slug: "immunity-bundle",
    name: "Immunity Bundle",
    description: "Immunity-focused bundle with Berry Immunity, Citrus Immune, and Greens Superfood Powder.",
    price: 1499,
    compareAtPrice: 1667,
    image: "/images/products/immunity-bundle.svg",
    badge: "Immunity Pack",
    includes: ["Berry Immunity Juice", "Citrus Immune Juice", "Greens Superfood Powder"],
    benefits: ["Immunity-first bundle", "Juice plus superfood combo", "Daily defense routine"],
    idealFor: "Customers focused on immunity and daily green nutrition.",
    duration: "Immunity routine pack",
    rating: 4.8,
    reviews: 54
  },
  {
    slug: "detox-glow-package",
    name: "Detox & Glow Package",
    description: "Two-juice package with Detox Cleanse and Radiant Glow for cleanse and skin wellness.",
    price: 699,
    compareAtPrice: 768,
    image: "/images/products/detox-glow-package.svg",
    badge: "2 Bottles",
    includes: ["Detox & Cleanse Juice", "Radiant Glow Juice"],
    benefits: ["Detox plus glow pairing", "Clean daily routine", "Skin wellness positioning"],
    idealFor: "Customers who want a simple detox and glow routine.",
    duration: "2 bottle package",
    rating: 4.8,
    reviews: 61
  },
  {
    slug: "complete-wellness-bundle",
    name: "Complete Wellness Bundle",
    description: "Five juices plus Wellness Gummies for a full Arogya Greenlife routine.",
    price: 2499,
    compareAtPrice: 2894,
    image: "/images/products/complete-wellness-bundle.svg",
    badge: "Best Value",
    includes: [
      "Berry Immunity Juice",
      "Detox & Cleanse Juice",
      "Energy Boost Juice",
      "Antioxidant Power Juice",
      "Green Glow Juice",
      "Wellness Gummies"
    ],
    benefits: ["Full wellness lineup", "Best value bundle", "Juices plus gummies combo"],
    idealFor: "Customers who want a complete Arogya Greenlife wellness routine.",
    duration: "Complete wellness bundle",
    rating: 4.9,
    reviews: 39
  }
];

export const testimonials: Testimonial[] = [
  {
    name: "Priya Mehta",
    location: "Mumbai",
    quote: "Berry Immunity and Detox Cleanse taste fresh and natural. The cold-pressed quality really shows.",
    rating: 5
  },
  {
    name: "Rahul Singh",
    location: "Delhi",
    quote: "The Immunity Bundle is perfect for my morning routine. Clean ingredients and no added sugar.",
    rating: 5
  },
  {
    name: "Ananya Reddy",
    location: "Hyderabad",
    quote: "Love the Arogya Greenlife branding and the Complete Wellness Bundle. Great value for the whole family.",
    rating: 5
  }
];

export const featuredProducts = products.slice(0, 6);
export const featuredPackages = packages;
