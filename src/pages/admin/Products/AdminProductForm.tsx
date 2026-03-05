import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createProduct,
  updateProduct,
} from "../../../api/admin/adminProduct.api";
import { fetchProduct } from "../../../api/product.api";
import { getCategories } from "../../../services/CategoryService";
import { getUnits } from "../../../services/admin/unit.service";
import { toast } from "react-toastify";
import "./AdminProductForm.css";

interface VariantForm {
  unitValueId: number;
  quantity: number;
  weight: number;
  price: number;
  comparePrice: number;
  stock: number;
  sku: string;
  barcode?: string;
  isDefaultVariant: boolean;
}

export default function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    richDescription: "",
    itemId: "",
    categoryId: "",
    hsnCode: "",
    taxRate: 0,
    currency: "INR",
    isBestSelling: false,
    variants: [] as VariantForm[],
  });

  // Load dropdowns
  useEffect(() => {
    getCategories().then(setCategories);
    getUnits(0, 100).then(setUnits);
  }, []);

  // Load product if edit
  useEffect(() => {
    if (!id) return;

    setLoadingData(true);
    fetchProduct(Number(id))
      .then((res) => {
        const p = res.successData;
        if (p) {
          setForm({
            name: p.name || "",
            description: p.description || "",
            richDescription: p.richDescription || "",
            itemId: p.itemId || "",
            categoryId: String(p.categoryId),
            hsnCode: p.hsnCode || "",
            taxRate: p.taxRate || 0,
            currency: p.currency || "INR",
            isBestSelling: p.isBestSelling || false,
            variants: p.variants.map((v: any) => ({
              unitValueId: v.unitId,
              quantity: v.quantity,
              weight: v.weight || 0,
              price: v.price,
              comparePrice: v.comparePrice || 0,
              stock: v.stock,
              sku: v.sku,
              barcode: v.barcode || "",
              isDefaultVariant: v.isDefaultVariant,
            })),
          });
          // Set existing images as previews
          if (p.images && p.images.length > 0) {
            setImagePreviews(p.images);
          }
        }
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [id]);

  // Handle image selection — append to existing images so multiple selections are kept
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImages((prev) => [...prev, ...files]);

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...previews]);

    e.target.value = ""; // Reset input so user can add more images in another click
  };

  // Remove image
  const removeImage = (index: number) => {
    const preview = imagePreviews[index];
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Add new variant
  const addVariant = () => {
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        {
          unitValueId: units[0]?.id || 0,
          quantity: 1,
          weight: 0,
          price: 0,
          comparePrice: 0,
          stock: 0,
          sku: "",
          isDefaultVariant: f.variants.length === 0,
        },
      ],
    }));
  };

  // Remove variant
  const removeVariant = (index: number) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }));
  };

  // Generate SKU (unique per variant by appending 1-based index)
  const generateSku = (index: number) => {
    const v = form.variants[index];
    const unit = units.find((u) => u.id === v.unitValueId);
    const base = `${
      form.itemId || form.name.replace(/\s+/g, "").toUpperCase()
    }-${v.quantity}${unit?.symbol || ""}`;
    const sku = `${base}-${index + 1}`;
    updateVariant(index, "sku", sku);
    toast.success("SKU generated successfully");
  };

  const updateVariant = (i: number, key: string, value: any) => {
    const variants = [...form.variants];
    variants[i] = { ...variants[i], [key]: value };
    setForm({ ...form, variants });
  };

  const setDefault = (i: number) => {
    const variants = form.variants.map((v, idx) => ({
      ...v,
      isDefaultVariant: idx === i,
    }));
    setForm({ ...form, variants });
    toast.success("Default variant updated");
  };

  const validate = () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return false;
    }

    if (!form.categoryId) {
      toast.error("Category is required");
      return false;
    }

    if (form.variants.length === 0) {
      toast.error("At least one variant is required");
      return false;
    }

    for (let i = 0; i < form.variants.length; i++) {
      const v = form.variants[i];
      if (!v.unitValueId) {
        toast.error(`Variant ${i + 1}: Unit is required`);
        return false;
      }
      if (v.price <= 0) {
        toast.error(`Variant ${i + 1}: Price must be greater than 0`);
        return false;
      }
      if (!v.sku.trim()) {
        toast.error(`Variant ${i + 1}: SKU is required`);
        return false;
      }
    }

    return true;
  };

  const submit = async () => {
    if (!validate()) return;

    setLoading(true);

    const fd = new FormData();
    fd.append("reqData", JSON.stringify(form));
    images.forEach((i) => fd.append("images", i));

    try {
      if (id) {
        const res = await updateProduct(Number(id), fd);
        if (!res.isError) {
          toast.success("Product updated successfully");
          navigate("/products");
        } else {
          toast.error(res.errorData.displayMessage);
        }
      } else {
        const res = await createProduct(fd);
        if (!res.isError) {
          toast.success("Product created successfully");
          navigate("/products");
        } else {
          toast.error(res.errorData.displayMessage);
        }
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onlyNumbers = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "e" ||
      e.key === "E" ||
      e.key === "+" ||
      e.key === "-" ||
      e.key === "."
    ) {
      e.preventDefault();
    }
  };

  if (loadingData) {
    return (
      <div className="product-form-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading product data...</p>
      </div>
    );
  }

  return (
    <div className="product-form-page">
      {/* Header */}
      <div className="product-form-header">
        <div>
          <h2 className="product-form-title">
            {id ? "Edit Product" : "Create New Product"}
          </h2>
          <p className="product-form-subtitle">
            {id
              ? "Update product information and variants"
              : "Add a new product to your catalog"}
          </p>
        </div>
        <button
          className="btn btn-outline-secondary btn-back"
          onClick={() => navigate("/products")}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Products
        </button>
      </div>

      {/* Basic Information */}
      <div className="form-section-card">
        <div className="form-section-header">
          <i className="bi bi-info-circle me-2"></i>
          <h5 className="form-section-title">Basic Information</h5>
        </div>
        <div className="form-section-body">
          <div className="form-group">
            <label className="form-label-custom">
              <i className="bi bi-tag-fill me-1"></i>
              Product Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-control-custom"
              placeholder="Enter product name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label-custom">
              <i className="bi bi-text-paragraph me-1"></i>
              Description
            </label>
            <textarea
              className="form-control-custom"
              placeholder="Enter product description"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label-custom">
              <i className="bi bi-file-text me-1"></i>
              Rich Description
            </label>
            <textarea
              className="form-control-custom"
              placeholder="Enter detailed product description (HTML supported)"
              rows={5}
              value={form.richDescription}
              onChange={(e) =>
                setForm({ ...form, richDescription: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label-custom">
              <i className="bi bi-hash me-1"></i>
              Item ID
            </label>
            <input
              type="text"
              className="form-control-custom"
              placeholder="Enter item ID (optional)"
              value={form.itemId}
              onChange={(e) => setForm({ ...form, itemId: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Category & Tax */}
      <div className="form-section-card">
        <div className="form-section-header">
          <i className="bi bi-folder-fill me-2"></i>
          <h5 className="form-section-title">Category & Tax</h5>
        </div>
        <div className="form-section-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label-custom">
                <i className="bi bi-tag me-1"></i>
                Category <span className="required">*</span>
              </label>
              <select
                className="form-control-custom"
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label-custom">
                <i className="bi bi-upc me-1"></i>
                HSN Code
              </label>
              <input
                type="text"
                className="form-control-custom"
                placeholder="Enter HSN code"
                value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label-custom">
                <i className="bi bi-percent me-1"></i>
                Tax Rate (%)
              </label>
              <input
                type="number"
                className="form-control-custom"
                placeholder="0"
                value={form.taxRate === 0 ? "" : form.taxRate}
                onKeyDown={onlyNumbers}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({
                    ...form,
                    taxRate: val === "" ? 0 : Number(val),
                  });
                }}
              />
            </div>
          </div>

          <div className="form-group-checkbox">
            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                className="form-check-input-custom"
                id="isBestSelling"
                checked={form.isBestSelling}
                onChange={(e) =>
                  setForm({ ...form, isBestSelling: e.target.checked })
                }
              />
              <label className="form-check-label-custom" htmlFor="isBestSelling">
                <i className="bi bi-star-fill me-2"></i>
                Mark as Best Selling Product
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Product Variants */}
      <div className="form-section-card">
        <div className="form-section-header">
          <div className="form-section-header-left">
            <i className="bi bi-box-seam me-2"></i>
            <h5 className="form-section-title">Product Variants</h5>
            {form.variants.length > 0 && (
              <span className="variant-count-badge">
                {form.variants.length} variant(s)
              </span>
            )}
          </div>
          <button className="btn btn-primary btn-sm" onClick={addVariant}>
            <i className="bi bi-plus-circle me-1"></i>
            Add Variant
          </button>
        </div>
        <div className="form-section-body">
          {form.variants.length === 0 ? (
            <div className="variants-empty">
              <i className="bi bi-box-seam"></i>
              <p>No variants added yet</p>
              <button className="btn btn-outline-primary" onClick={addVariant}>
                <i className="bi bi-plus-circle me-1"></i>
                Add First Variant
              </button>
            </div>
          ) : (
            <div className="variants-list">
              {form.variants.map((v, i) => (
                <div key={i} className="variant-card">
                  <div className="variant-card-header">
                    <div className="variant-card-title">
                      <span className="variant-number">Variant {i + 1}</span>
                      {v.isDefaultVariant && (
                        <span className="default-badge">
                          <i className="bi bi-star-fill me-1"></i>
                          Default
                        </span>
                      )}
                    </div>
                    {form.variants.length > 1 && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeVariant(i)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>

                  <div className="variant-card-body">
                    <div className="variant-form-row">
                      <div className="variant-form-group">
                        <label className="variant-label">
                          <i className="bi bi-rulers me-1"></i>
                          Unit <span className="required">*</span>
                        </label>
                        <select
                          className="form-control-custom"
                          value={v.unitValueId}
                          onChange={(e) =>
                            updateVariant(
                              i,
                              "unitValueId",
                              Number(e.target.value)
                            )
                          }>
                          <option value={0}>Select Unit</option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.symbol})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="variant-form-group">
                        <label className="variant-label">
                          <i className="bi bi-123 me-1"></i>
                          Quantity
                        </label>
                        <input
                          type="number"
                          className="form-control-custom"
                          placeholder="1"
                          onKeyDown={onlyNumbers}
                          value={v.quantity === 0 ? "" : v.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateVariant(
                              i,
                              "quantity",
                              val === "" ? 0 : Number(val)
                            );
                          }}
                        />
                      </div>

                      <div className="variant-form-group">
                        <label className="variant-label">
                          <i className="bi bi-weight me-1"></i>
                          Weight
                        </label>
                        <input
                          type="number"
                          className="form-control-custom"
                          placeholder="0"
                          onKeyDown={onlyNumbers}
                          value={v.weight === 0 ? "" : v.weight}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateVariant(i, "weight", val === "" ? 0 : Number(val));
                          }}
                        />
                      </div>
                    </div>

                    <div className="variant-form-row">
                      <div className="variant-form-group">
                        <label className="variant-label">
                          <i className="bi bi-currency-rupee me-1"></i>
                          Price <span className="required">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control-custom"
                          placeholder="0.00"
                          onKeyDown={onlyNumbers}
                          value={v.price === 0 ? "" : v.price}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateVariant(i, "price", val === "" ? 0 : Number(val));
                          }}
                        />
                      </div>

                      <div className="variant-form-group">
                        <label className="variant-label">
                          <i className="bi bi-tag me-1"></i>
                          Compare Price
                        </label>
                        <input
                          type="number"
                          className="form-control-custom"
                          placeholder="0.00"
                          onKeyDown={onlyNumbers}
                          value={v.comparePrice === 0 ? "" : v.comparePrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateVariant(
                              i,
                              "comparePrice",
                              val === "" ? 0 : Number(val)
                            );
                          }}
                        />
                      </div>

                      <div className="variant-form-group">
                        <label className="variant-label">
                          <i className="bi bi-box me-1"></i>
                          Stock
                        </label>
                        <input
                          type="number"
                          className="form-control-custom"
                          placeholder="0"
                          onKeyDown={onlyNumbers}
                          value={v.stock === 0 ? "" : v.stock}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateVariant(i, "stock", val === "" ? 0 : Number(val));
                          }}
                        />
                      </div>
                    </div>

                    <div className="variant-form-row">
                      <div className="variant-form-group flex-grow">
                        <label className="variant-label">
                          <i className="bi bi-upc-scan me-1"></i>
                          SKU <span className="required">*</span>
                        </label>
                        <div className="sku-input-group">
                          <input
                            type="text"
                            className="form-control-custom"
                            placeholder="Enter SKU"
                            value={v.sku}
                            onChange={(e) => updateVariant(i, "sku", e.target.value)}
                          />
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => generateSku(i)}
                            type="button">
                            <i className="bi bi-magic me-1"></i>
                            Auto
                          </button>
                        </div>
                      </div>

                      <div className="variant-form-group variant-actions">
                        <label className="variant-label">&nbsp;</label>
                        <button
                          className={`btn btn-sm ${
                            v.isDefaultVariant
                              ? "btn-success"
                              : "btn-outline-primary"
                          }`}
                          onClick={() => setDefault(i)}
                          type="button">
                          {v.isDefaultVariant ? (
                            <>
                              <i className="bi bi-check-circle me-1"></i>
                              Default
                            </>
                          ) : (
                            <>
                              <i className="bi bi-star me-1"></i>
                              Make Default
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Images */}
      <div className="form-section-card">
        <div className="form-section-header">
          <i className="bi bi-image me-2"></i>
          <h5 className="form-section-title">Product Images</h5>
        </div>
        <div className="form-section-body">
          <div className="image-upload-section">
            <div className="image-upload-wrapper">
              <input
                type="file"
                multiple
                accept="image/*"
                className="image-input"
                onChange={handleImageChange}
              />
              <div className="image-upload-placeholder">
                <i className="bi bi-cloud-upload"></i>
                <p>Click to upload or drag and drop</p>
                <small>PNG, JPG up to 5MB each</small>
              </div>
            </div>

            {imagePreviews.length > 0 && (
              <div className="image-previews-grid">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button
                      className="btn-remove-image"
                      onClick={() => removeImage(index)}
                      type="button">
                      <i className="bi bi-x-circle-fill"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions-bar">
        <button
          className="btn btn-secondary btn-cancel"
          onClick={() => navigate("/products")}
          disabled={loading}>
          Cancel
        </button>
        <button
          className="btn btn-primary btn-save"
          onClick={submit}
          disabled={loading}>
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"></span>
              {id ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              <i className="bi bi-check-lg me-1"></i>
              {id ? "Update Product" : "Create Product"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
