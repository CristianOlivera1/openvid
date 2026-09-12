import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import DonateClient from "./DonateClient";
import { buildPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("donation.page");

  return buildPageMetadata({
    locale,
    path: "/donate",
    title: t("title"),
    description: t("description"),
    imageAlt: "Openvid — Support the project",
  });
}

export interface DonationMethod {
  id: "yape" | "visa" | "paypal";
  name: string;
  tagline: string;
  icon?: string;
  image?: string;
  color: string;
  detail: string;
  phone?: string;
  qrImage?: string;
  account?: string;
  cci?: string;
  email?: string;
  link?: string;
}

export default async function DonatePage() {
  const t = await getTranslations("donation.page");
  const headersList = await headers();
  const country = headersList.get("x-user-country") || "UNKNOWN";

  const isPeru = country === "PE" || country === "UNKNOWN";

  const allMethods: DonationMethod[] = [
    {
      id: "paypal",
      name: "PayPal",
      tagline: t("paypal.tagline"),
      icon: "logos:paypal",
      color: "#009CDE",
      detail: t("paypal.detail"),
      email: "oliverachavezcristian@gmail.com",
      link: "https://www.paypal.com/ncp/payment/AZ3LS98LJ9SM2",
    },
    {
      id: "yape",
      name: "Yape",
      tagline: t("yape.tagline"),
      icon: "simple-icons:yape",
      image: "/images/pages/yape.avif",
      color: "#6C3EB8",
      detail: t("yape.detail"),
      phone: "+51 954 306 632",
      qrImage: "/images/pages/qr.avif",
    },
    {
      id: "visa",
      name: "Visa",
      tagline: t("visa.tagline"),
      icon: "mdi:bank-outline",
      image: "/images/pages/visa.avif",
      color: "#F5A623",
      detail: t("visa.detail"),
      account: "200-12083829-0-69",
      cci: "002-20011208382906945",
    }
  ];

  const availableMethods = isPeru
    ? allMethods
    : allMethods.filter(m => m.id !== "paypal");

  const defaultMethod = "paypal";

  return <DonateClient methods={availableMethods} defaultMethod={defaultMethod} />;
}