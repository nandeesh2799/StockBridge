import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import API from "../../api/axiosInstance";
import { Link } from "react-router-dom";

const Profile = () => {
  const { shopProfile, setShopProfile } = useOutletContext();
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024)
      return toast.error("Image must be under 2MB.");
    setUploading(true);
    try {
      const authRes = await API.get("/upload/auth");
      const { token, expire, signature } = authRes.data;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", `retailflow_avatar_${shopProfile._id}`);
      formData.append("publicKey", import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY);
      formData.append("token", token);
      formData.append("expire", expire);
      formData.append("signature", signature);
      const ikRes = await fetch(
        "https://upload.imagekit.io/api/v1/files/upload",
        { method: "POST", body: formData },
      );
      const ikData = await ikRes.json();
      if (!ikData.url) throw new Error("Upload failed");
      const profileRes = await API.put("/auth/profile", { avatar: ikData.url });
      setShopProfile(profileRes.data.data);
      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error(err.message || "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  const avatarUrl = shopProfile?.avatar;
  const initials = (shopProfile?.shopName || shopProfile?.ownerName || "SB")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white tracking-tight">
          {"Profile"}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Your account details and profile photo.
        </p>
      </div>

      <div className="bg-[#111113] border border-slate-800 rounded-2xl p-8 text-center">
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-2xl bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-3xl overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg">
            <Camera size={14} className="text-white" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {uploading && (
          <p className="text-indigo-400 text-sm font-bold animate-pulse mb-4">
            Uploading...
          </p>
        )}

        <h2 className="text-xl font-black text-white">
          {shopProfile?.ownerName}
        </h2>
        <p className="text-slate-400 font-medium">{shopProfile?.shopName}</p>
        <p className="text-slate-500 text-sm mt-1">{shopProfile?.email}</p>

        <div className="mt-8 grid grid-cols-2 gap-4 text-left">
          {[
            { label: "Email", value: shopProfile?.email },
            { label: "Phone", value: shopProfile?.phone },
            { label: "Gstin", value: shopProfile?.gstin || "—" },
            { label: "Upi Id", value: shopProfile?.upiId || "—" },
            {
              label: "Business Type",
              value: shopProfile?.businessType || "Retail",
            },
            { label: "Address", value: shopProfile?.address || "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-[#09090b] p-4 rounded-xl border border-slate-800"
            >
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                {label}
              </p>
              <p className="text-sm font-bold text-white truncate">{value}</p>
            </div>
          ))}
        </div>

        <p className="text-slate-600 text-xs mt-6">
          To edit profile details, go to{" "}
          <Link
            to="/dashboard/settings"
            className="text-indigo-400 font-bold hover:text-indigo-300 underline transition-colors"
          >
            {"Settings"}
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Profile;
