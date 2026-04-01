import { useEffect, useState, useRef } from "react";
import ImageCropModal from "./ImageCropModal";
import { assetUrl } from "../utils/assetUrl";
import "./ShopSettings.css";

import { API_BASE as API, IMG_BASE } from "../config.js";

export default function ShopSettings({ onBack, user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("");
  const [phone, setPhone] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [since, setSince] = useState("");
  const [slug, setSlug] = useState("");
  const [shopName, setShopName] = useState("");
  const [headerPreview, setHeaderPreview] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [headerFile, setHeaderFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [cropModal, setCropModal] = useState(null);
  const headerInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // Customization state
  const [tagline, setTagline] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [openingHours, setOpeningHours] = useState("");
  const [accentColor, setAccentColor] = useState("#5c6b3a");
  const [featuredItems, setFeaturedItems] = useState([]);
  const [backgroundPattern, setBackgroundPattern] = useState("");
  const [myItems, setMyItems] = useState([]);
  const [customizationMsg, setCustomizationMsg] = useState("");

  useEffect(() => {
    if (!user || user.role !== "seller") {
      setLoading(false);
      return;
    }
    fetch(`${API}/shop/my`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.seller) {
          setShopDescription(data.seller.shopDescription || "");
          setTagsStr((data.seller.tags || []).join(", "));
          setLocation(data.seller.location || "");
          setHours(data.seller.hours || "");
          setPhone(data.seller.phone || "");
          setShopEmail(data.seller.shopEmail || "");
          setSince(data.seller.since || "");
          setSlug(data.seller.slug || "");
          setShopName(data.seller.shopName || "");
          if (data.seller.headerImageUrl) setHeaderPreview(assetUrl(data.seller.headerImageUrl));
          if (data.seller.shopLogoUrl) setLogoPreview(assetUrl(data.seller.shopLogoUrl));
          // Load customization fields
          setTagline(data.seller.tagline || "");
          setAnnouncement(data.seller.announcement || "");
          setAnnouncementActive(data.seller.announcementActive || false);
          setOpeningHours(data.seller.openingHours || "");
          setAccentColor(data.seller.accentColor || "#5c6b3a");
          setFeaturedItems(data.seller.featuredItems || []);
          setBackgroundPattern(data.seller.backgroundPattern || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    return () => {
      if (cropModal?.src?.startsWith("blob:")) URL.revokeObjectURL(cropModal.src);
    };
  }, [cropModal?.src]);

  const saveText = async () => {
    setMsg("");
    setSaving(true);
    try {
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch(`${API}/shop/my`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ shopDescription, tags, location, hours, phone, shopEmail, since }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMsg("Saved.");
    } catch {
      setMsg("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const uploadBranding = async () => {
    if (!headerFile && !logoFile) {
      setMsg("Choose and crop a header and/or logo image, then upload.");
      return;
    }
    setMsg("");
    setSaving(true);
    try {
      const fd = new FormData();
      if (headerFile) fd.append("header", headerFile);
      if (logoFile) fd.append("logo", logoFile);
      const res = await fetch(`${API}/shop/my/branding`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.headerImageUrl) {
        setHeaderPreview(assetUrl(data.headerImageUrl));
        setHeaderFile(null);
      }
      if (data.shopLogoUrl) {
        setLogoPreview(assetUrl(data.shopLogoUrl));
        setLogoFile(null);
      }
      setMsg("Images updated.");
    } catch {
      setMsg("Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const saveCustomization = async () => {
    setCustomizationMsg("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/shop/customise`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tagline,
          announcement,
          announcementActive,
          openingHours,
          accentColor,
          featuredItems,
          backgroundPattern,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setCustomizationMsg("Customization saved.");
    } catch {
      setCustomizationMsg("Could not save customization.");
    } finally {
      setSaving(false);
    }
  };

  const openHeaderPicker = () => headerInputRef.current?.click();
  const openLogoPicker = () => logoInputRef.current?.click();

  const onHeaderFileChosen = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    const src = URL.createObjectURL(f);
    setCropModal({ src, type: "header" });
  };

  const onLogoFileChosen = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    const src = URL.createObjectURL(f);
    setCropModal({ src, type: "logo" });
  };

  const closeCrop = () => {
    if (cropModal?.src?.startsWith("blob:")) URL.revokeObjectURL(cropModal.src);
    setCropModal(null);
  };

  const onCropDone = (file) => {
    if (!cropModal) return;
    const { type, src } = cropModal;
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
    if (type === "header") {
      setHeaderFile(file);
      setHeaderPreview(URL.createObjectURL(file));
    } else {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
    setCropModal(null);
    setMsg("Cropped image ready — tap “Upload images” to save to your storefront.");
  };

  if (!user || user.role !== "seller") {
    return (
      <div className="shopsettings-page">
        <button type="button" className="shopsettings-back" onClick={onBack}>← Back</button>
        <p>Seller access only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shopsettings-page">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="shopsettings-page">
      {cropModal && (
        <ImageCropModal
          imageSrc={cropModal.src}
          aspect={cropModal.type === "header" ? 21 / 9 : 1}
          title={cropModal.type === "header" ? "Crop header banner" : "Crop shop logo"}
          onCancel={closeCrop}
          onDone={onCropDone}
        />
      )}

      <button type="button" className="shopsettings-back" onClick={onBack}>← Back</button>
      <header className="shopsettings-header">
        <h1>Shop settings</h1>
        <p className="shopsettings-slug-hint">
          Storefront: <strong>{shopName}</strong>
          {slug ? ` · slug: ${slug}` : ""}
        </p>
        <p className="shopsettings-note">
          Choose photos from your gallery, adjust the crop, then upload. Profile photo for your account is under Account.
        </p>
      </header>

      <section className="shopsettings-card">
        <h2>Description</h2>
        <textarea
          className="shopsettings-textarea"
          rows={5}
          value={shopDescription}
          onChange={(e) => setShopDescription(e.target.value)}
          placeholder="Tell buyers what makes your shop special…"
        />
        <label className="shopsettings-label">Tags (comma-separated)</label>
        <input
          className="shopsettings-input"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="Vintage, Denim, Streetwear"
        />
        <label className="shopsettings-label">Location</label>
        <input
          className="shopsettings-input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Lahore, Pakistan"
        />
        <label className="shopsettings-label">Hours</label>
        <input
          className="shopsettings-input"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="e.g. Mon–Sat 10 am – 7 pm"
        />
        <label className="shopsettings-label">Phone</label>
        <input
          className="shopsettings-input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+92 300 0000000"
        />
        <label className="shopsettings-label">Contact email</label>
        <input
          className="shopsettings-input"
          type="email"
          value={shopEmail}
          onChange={(e) => setShopEmail(e.target.value)}
          placeholder="shop@example.com"
        />
        <label className="shopsettings-label">Established (year or text)</label>
        <input
          className="shopsettings-input"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          placeholder="2019"
        />
        <button type="button" className="shopsettings-primary" onClick={saveText} disabled={saving}>
          Save
        </button>
      </section>

      <section className="shopsettings-card">
        <h2>Branding</h2>
        <input
          ref={headerInputRef}
          type="file"
          accept="image/*"
          className="shopsettings-file-hidden"
          onChange={onHeaderFileChosen}
        />
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="shopsettings-file-hidden"
          onChange={onLogoFileChosen}
        />
        <div className="shopsettings-preview-row">
          <div>
            <span className="shopsettings-label">Header banner (wide)</span>
            <div
              className="shopsettings-banner-preview"
              style={headerPreview ? { backgroundImage: `url(${headerPreview})` } : {}}
            />
            <button type="button" className="shopsettings-file-btn" onClick={openHeaderPicker}>
              Choose from gallery &amp; crop
            </button>
          </div>
          <div>
            <span className="shopsettings-label">Shop logo (square)</span>
            <div className="shopsettings-logo-preview-wrap">
              {logoPreview ? (
                <img src={logoPreview} alt="" className="shopsettings-logo-preview" />
              ) : (
                <div className="shopsettings-logo-placeholder">Logo</div>
              )}
            </div>
            <button type="button" className="shopsettings-file-btn" onClick={openLogoPicker}>
              Choose from gallery &amp; crop
            </button>
          </div>
        </div>
        <button type="button" className="shopsettings-primary" onClick={uploadBranding} disabled={saving}>
          Upload images
        </button>
      </section>

      <section className="shopsettings-card">
        <h2>Customise Your Shop</h2>
        
        {/* Tagline */}
        <label className="shopsettings-label">Tagline (max 80 chars)</label>
        <input
          className="shopsettings-input"
          value={tagline}
          onChange={(e) => setTagline(e.target.value.slice(0, 80))}
          placeholder="e.g., Curated vintage finds from the 90s"
          maxLength={80}
        />
        <small className="shopsettings-hint">{tagline.length}/80</small>
        
        {/* Announcement Banner */}
        <label className="shopsettings-label">Announcement Banner</label>
        <div className="shopsettings-toggle-row">
          <span>Enable announcement</span>
          <button
            type="button"
            className={`shopsettings-toggle ${announcementActive ? "active" : ""}`}
            onClick={() => setAnnouncementActive(!announcementActive)}
          >
            {announcementActive ? "ON" : "OFF"}
          </button>
        </div>
        {announcementActive && (
          <>
            <textarea
              className="shopsettings-textarea"
              rows={2}
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value.slice(0, 200))}
              placeholder="e.g., Sale this weekend! or Closed for Eid"
              maxLength={200}
            />
            <small className="shopsettings-hint">{announcement.length}/200</small>
          </>
        )}
        
        {/* Opening Hours */}
        <label className="shopsettings-label">Opening Hours</label>
        <input
          className="shopsettings-input"
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
          placeholder="e.g., Mon–Sat 10am–7pm · Closed Sundays"
        />
        
        {/* Accent Color */}
        <label className="shopsettings-label">Accent Color</label>
        <div className="shopsettings-color-grid">
          {[
            { hex: "#5c6b3a", name: "Moss Green" },
            { hex: "#c17a5f", name: "Rust" },
            { hex: "#d4a574", name: "Clay" },
            { hex: "#8b6f47", name: "Bark" },
            { hex: "#a8b5a0", name: "Sage" },
            { hex: "#6b7b8c", name: "Slate" },
            { hex: "#d4a5a5", name: "Blush" },
            { hex: "#4a4a4a", name: "Charcoal" },
          ].map((color) => (
            <button
              key={color.hex}
              type="button"
              className={`shopsettings-color-swatch ${accentColor === color.hex ? "selected" : ""}`}
              style={{ backgroundColor: color.hex }}
              onClick={() => setAccentColor(color.hex)}
              title={color.name}
            >
              {accentColor === color.hex && "✓"}
            </button>
          ))}
        </div>
        
        {/* Background Pattern */}
        <label className="shopsettings-label">Background Pattern</label>
        <div className="shopsettings-pattern-grid">
          <button
            type="button"
            className={`shopsettings-pattern-tile ${backgroundPattern === "" ? "selected" : ""}`}
            onClick={() => setBackgroundPattern("")}
          >
            <span className="pattern-preview plain">None</span>
          </button>
          {[
            { key: "paw-prints", name: "Paw Prints" },
            { key: "shoe-prints", name: "Shoe Prints" },
            { key: "tote-bags", name: "Tote Bags" },
            { key: "jackets", name: "Jackets" },
            { key: "shirts-tees", name: "Shirts/Tees" },
            { key: "floral", name: "Floral" },
            { key: "stars", name: "Stars" },
            { key: "leaves", name: "Leaves" },
          ].map((pattern) => (
            <button
              key={pattern.key}
              type="button"
              className={`shopsettings-pattern-tile ${backgroundPattern === pattern.key ? "selected" : ""}`}
              onClick={() => setBackgroundPattern(pattern.key)}
            >
              <span className={`pattern-preview ${pattern.key}`}>{pattern.name}</span>
            </button>
          ))}
        </div>
        
        <button type="button" className="shopsettings-primary" onClick={saveCustomization} disabled={saving}>
          Save Customization
        </button>
        {customizationMsg && <p className="shopsettings-msg">{customizationMsg}</p>}
      </section>

      {msg && <p className="shopsettings-msg">{msg}</p>}
    </div>
  );
}
