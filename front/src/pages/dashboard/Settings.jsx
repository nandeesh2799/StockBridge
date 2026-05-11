import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Upload, X, ImageIcon, Globe } from "lucide-react";
import API from "../../api/axiosInstance";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";

const schema = z.object({
  shopName: z.string().min(2, "Shop name must be at least 2 characters"),
  ownerName: z.string().min(2, "Owner name required"),
  phone: z.string().regex(/^\d{10}$/, "Enter valid 10-digit phone"),
  address: z.string().optional(),
  upiId: z.string().optional(),
  gstin: z.string().optional(),
  bankAccount: z.string().optional(),
  ifsc: z.string().optional(),
  businessType: z.enum(["Retail", "Wholesale", "Both"]).optional(),
  currency: z.string().optional(),
});

// Reusable ImageKit upload helper
const uploadToImageKit = async (file, fileName) => {
  const authRes = await API.get("/upload/auth");
  if (!authRes.data?.token || !authRes.data?.signature || !authRes.data?.expire) {
    throw new Error(
      authRes.data?.message ||
        "Upload service is not configured. Contact admin to set ImageKit keys on server.",
    );
  }
  const { token, expire, signature, publicKey } = authRes.data;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", `${fileName}_${Date.now()}`);
  formData.append(
    "publicKey",
    publicKey || import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "",
  );
  formData.append("token", token);
  formData.append("expire", expire);
  formData.append("signature", signature);
  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data?.message || data?.help || "Upload failed");
  }
  return data.url;
};

const ImageUploadSection = ({
  label,
  hint,
  currentUrl,
  onUpload,
  accept = "image/*",
  uploading,
}) => (
  <div>
    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
      {label}
    </label>
    <p className="text-xs text-slate-500 mb-3">{hint}</p>
    <div className="flex items-start gap-4">
      {/* Preview */}
      <div className="w-24 h-24 rounded-xl bg-[#09090b] border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <ImageIcon size={24} className="text-slate-600" />
        )}
      </div>
      {/* Upload button */}
      <div className="flex flex-col gap-2">
        <label
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all font-bold text-sm ${uploading ? "border-slate-700 text-slate-500 cursor-not-allowed" : "border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10"}`}
        >
          <Upload size={15} />
          {uploading ? "Uploading..." : `Upload ${label}`}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={onUpload}
          />
        </label>
        <p className="text-[11px] text-slate-600">PNG, JPG up to 2MB</p>
        {currentUrl && (
          <p className="text-[11px] text-emerald-400 font-bold">✓ Uploaded</p>
        )}
      </div>
    </div>
  </div>
);

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { shopProfile, setShopProfile } = useOutletContext();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [localLogo, setLocalLogo] = useState(null);
  const [localSignature, setLocalSignature] = useState(null);
  const [uploadServiceStatus, setUploadServiceStatus] = useState("checking");

  const schema = z.object({
    shopName: z.string().min(2, t("validation.required")),
    ownerName: z.string().min(2, t("validation.required")),
    phone: z.string().regex(/^\d{10}$/, t("validation.invalidPhone")),
    address: z.string().optional(),
    upiId: z.string().optional(),
    gstin: z.string().optional(),
    bankAccount: z.string().optional(),
    ifsc: z.string().optional(),
    businessType: z.enum(["Retail", "Wholesale", "Both"]).optional(),
    currency: z.string().optional(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      shopName: "",
      ownerName: "",
      phone: "",
      address: "",
      upiId: "",
      gstin: "",
      bankAccount: "",
      ifsc: "",
      businessType: "Retail",
      currency: "INR",
    },
  });

  useEffect(() => {
    if (shopProfile) {
      reset({
        shopName: shopProfile.shopName || "",
        ownerName: shopProfile.ownerName || "",
        phone: shopProfile.phone || "",
        address: shopProfile.address || "",
        upiId: shopProfile.upiId || "",
        gstin: shopProfile.gstin || "",
        bankAccount: shopProfile.bankAccount || "",
        ifsc: shopProfile.ifsc || "",
        businessType: shopProfile.businessType || "Retail",
        currency: shopProfile.currency || "INR",
      });
      setLocalLogo(shopProfile.logo || null);
      setLocalSignature(shopProfile.signature || null);
    }
  }, [shopProfile, reset]);

  useEffect(() => {
    const checkUploadService = async () => {
      setUploadServiceStatus("checking");
      try {
        const res = await API.get("/upload/auth");
        if (res.data?.token && res.data?.signature && res.data?.expire) {
          setUploadServiceStatus("ready");
        } else {
          setUploadServiceStatus("unavailable");
        }
      } catch {
        setUploadServiceStatus("unavailable");
      }
    };
    checkUploadService();
  }, []);

  const onSubmit = async (data) => {
    try {
      const res = await API.put("/auth/profile", { ...data, language: i18n.language });
      setShopProfile(res.data.data);
      toast.success(t("settings.settingsSaved"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("common.errorSaving"));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024)
      return toast.error("Image must be under 2MB.");
    setUploadingLogo(true);
    try {
      const url = await uploadToImageKit(
        file,
        `retailflow_logo_${shopProfile._id}`,
      );
      const res = await API.put("/auth/profile", { logo: url });
      setShopProfile(res.data.data);
      setLocalLogo(url);
      toast.success(t("toast.settingsSaved"));
    } catch (err) {
      toast.error(err.message || "Logo upload failed.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024)
      return toast.error("File must be under 2MB.");
    // Validate it's an image
    if (!file.type.startsWith("image/"))
      return toast.error(t("validation.uploadError"));
    setUploadingSignature(true);
    try {
      const url = await uploadToImageKit(
        file,
        `retailflow_signature_${shopProfile._id}`,
      );
      const res = await API.put("/auth/profile", { signature: url });
      setShopProfile(res.data.data);
      setLocalSignature(url);
      toast.success(t("toast.settingsSaved"));
    } catch (err) {
      toast.error(err.message || "Signature upload failed.");
    } finally {
      setUploadingSignature(false);
    }
  };

  const Field = ({ label, name, placeholder, type = "text" }) => (
    <div>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-slate-700 text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors font-medium"
      />
      {errors[name] && (
        <p className="text-rose-400 text-xs mt-1 font-bold">
          {errors[name].message}
        </p>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white tracking-tight">
          {t("settings.businessSettings")}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          {t("settings.businessSettingsDesc")}
        </p>
      </div>

      {/* === LANGUAGE SECTION === */}
      <div className="bg-[#111113] border border-slate-800 rounded-2xl p-6 space-y-4 mb-6">
        <div>
          <h2 className="font-bold text-white text-lg flex items-center gap-2">
            <Globe size={20} className="text-indigo-400" />
            {t("settings.language")}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t("settings.languageDesc")}
          </p>
        </div>
        <div className="max-w-xs">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="bg-[#111113] border border-slate-800 rounded-2xl p-6 space-y-6 mb-6">
        <div>
          <h2 className="font-bold text-white text-lg mb-1">{t("settings.brandAssets")}</h2>
          <p className="text-xs text-slate-500">
            {t("settings.brandAssetsDesc")}
          </p>
          <div className="mt-3">
            {uploadServiceStatus === "checking" && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-bold">
                {t("common.loading")}
              </span>
            )}
            {uploadServiceStatus === "ready" && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                {t("settings.uploaded")}
              </span>
            )}
            {uploadServiceStatus === "unavailable" && (
              <div className="inline-flex flex-col gap-1 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold">
                <span>{t("validation.uploadError")}</span>
              </div>
            )}
          </div>
        </div>

        <ImageUploadSection
          label={t("settings.shopLogo")}
          hint={t("settings.shopLogoDesc")}
          currentUrl={localLogo}
          onUpload={handleLogoUpload}
          uploading={uploadingLogo}
        />

        <div className="border-t border-slate-800/60 pt-6">
          <ImageUploadSection
            label={t("settings.signature")}
            hint={t("settings.signatureDesc")}
            currentUrl={localSignature}
            onUpload={handleSignatureUpload}
            uploading={uploadingSignature}
            accept="image/png,image/jpeg,image/webp"
          />
        </div>
      </div>

      {/* === BUSINESS INFO SECTION === */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-[#111113] border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white text-lg">{t("settings.businessInfo")}</h2>
          <Field
            label={t("settings.shopName")}
            name="shopName"
            placeholder={t("settings.shopName")}
          />
          <Field
            label={t("settings.ownerName")}
            name="ownerName"
            placeholder={t("settings.ownerName")}
          />
          <Field
            label={t("settings.phoneNumber")}
            name="phone"
            placeholder="10-digit mobile"
            type="tel"
          />
          <Field
            label={t("settings.address")}
            name="address"
            placeholder={t("settings.address")}
          />
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              {t("settings.businessType")}
            </label>
            <select
              {...register("businessType")}
              className="w-full px-4 py-3 rounded-xl bg-[#09090b] border border-slate-700 text-white outline-none focus:border-indigo-500"
            >
              {[
                { val: "Retail", label: t("common.retail") },
                { val: "Wholesale", label: t("common.wholesale") },
                { val: "Both", label: t("common.both") },
              ].map((type) => (
                <option key={type.val} value={type.val}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-[#111113] border border-slate-800 rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white text-lg">{t("settings.paymentDetails")}</h2>
          <div>
            <Field label={t("settings.upiId")} name="upiId" placeholder="yourname@paytm" />
            <p className="text-xs text-slate-500 mt-1">
              {t("billing.addUpiPrompt")}
            </p>
          </div>
          <Field
            label={t("settings.gstin")}
            name="gstin"
            placeholder="22AAAAA0000A1Z5"
          />
          <Field
            label={t("settings.bankAccount")}
            name="bankAccount"
            placeholder={t("settings.bankAccount")}
          />
          <Field label={t("settings.ifsc")} name="ifsc" placeholder="IFSC" />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? t("common.processing")
            : isDirty
              ? t("settings.saveSettings")
              : t("settings.noChanges")}
        </button>
      </form>
    </div>
  );
};

export default Settings;
