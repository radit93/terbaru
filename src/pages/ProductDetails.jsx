import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { useAuth } from "../context/authContext";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  
  const [loading, setLoading] = useState(true);

  // FIXED SIZE RANGE
  const fixedSizes = Array.from({ length: 12 }, (_, i) => (36 + i).toString());

  useEffect(() => {
    async function fetchData() {
      const { data: prod } = await supabase
        .from("product")
        .select("*, brands(name)")
        .eq("id", id)
        .single();

      const { data: imgs } = await supabase
        .from("product_image")
        .select("*")
        .eq("product_id", id)
        .order("order", { ascending: true });

      const { data: vars } = await supabase
        .from("stock_variants")
        .select("*, grades(name)")
        .eq("product_id", id);

      setProduct(prod);
      setImages(imgs || []);
      setVariants(vars || []);
      setLoading(false);
    }

    fetchData();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Produk tidak ditemukan</div>;

  // Ambil list unik grades dari DB
  const grades = [...new Set(variants.map((v) => v.grades?.name))];

  // SIZE AVAILABLE LOGIC
  const isSizeAvailable = (size) => {
    return variants.some(
      (v) =>
        v.size === size &&
        (!selectedGrade || v.grades?.name === selectedGrade) &&
        v.stock > 0
    );
  };

  // GRADE AVAILABLE LOGIC
  const isGradeAvailable = (grade) => {
    return variants.some(
      (v) =>
        v.grades?.name === grade &&
        (!selectedSize || v.size === selectedSize) &&
        v.stock > 0
    );
  };

  const finalVariant = variants.find(
    (v) =>
      v.size === selectedSize &&
      v.grades?.name === selectedGrade
  );

  // Cart Button const { user } = useAuth();

const addToCart = async () => {
  if (!user) return;

  if (!finalVariant) {
    alert("Pilih size dan grades terlebih dahulu");
    return;
  }

  const { data: exist } = await supabase
    .from("cart")
    .select("*")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .eq("variant_id", finalVariant.id)
    .single();

  if (exist) {
    await supabase
      .from("cart")
      .update({ quantity: exist.quantity + 1 })
      .eq("id", exist.id);

    window.dispatchEvent(new Event("cart-updated"));
    return;
  }

  await supabase.from("cart").insert([
    {
      user_id: user.id,
      product_id: product.id,
      variant_id: finalVariant.id,
      quantity: 1,
    },
  ]);

  window.dispatchEvent(new Event("cart-updated"));
};

// Wishlist Button
const toggleWishlist = async () => {
  if (!user) return;

  const { data: exist } = await supabase
    .from("wishlist")
    .select("*")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .single();

  if (exist) {
    await supabase.from("wishlist").delete().eq("id", exist.id);
    window.dispatchEvent(new Event("wishlist-updated"));
    return;
  }

  await supabase.from("wishlist").insert([
    {
      user_id: user.id,
      product_id: product.id,
    },
  ]);

  window.dispatchEvent(new Event("wishlist-updated"));
};


  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 border border-gray-400 rounded bg-white hover:bg-gray-100 transition"
      >
        Kembali
      </button>

      {/* GALERI */}
      <div className="w-full mb-4">
        <div className="flex overflow-x-auto gap-3">
          {images.map((img) => (
            <img
              key={img.id}
              src={img.image_url}
              alt={product.name}
              className="w-60 h-60 object-cover rounded-md"
            />
          ))}
        </div>
      </div>

      {/* INFO PRODUK */}
      <h1 className="text-2xl font-semibold">{product.name}</h1>
      <p className="text-gray-600">{product.brands?.name}</p>
      <p className="mt-2">{product.description}</p>

      {/* SIZE SELECTOR */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Pilih Size</h3>
        <div className="flex gap-2 flex-wrap">

          {fixedSizes.map((size) => {
            const available = isSizeAvailable(size);

            return (
              <button
                key={size}
                onClick={() => {
                  if (!available) return;
                  setSelectedSize(prev => prev === size ? null : size);
                }}
                className={`px-4 py-2 border rounded
                  ${available ? "bg-white" : "bg-gray-300 cursor-not-allowed"}
                  ${
                    selectedSize === size
                      ? "border-black font-semibold"
                      : "border-gray-400"
                  }
                `}
                disabled={!available}
              >
                {size}
              </button>
            );
          })}

        </div>
      </div>

      {/* GRADES SELECTOR */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Pilih Grades</h3>
        <div className="flex gap-2 flex-wrap">

          {grades.map((grade) => {
            const available = isGradeAvailable(grade);

            return (
              <button
                key={grade}
                onClick={() => {
                  if (!available) return;
                  setSelectedGrade(prev => prev === grade ? null : grade);
                }}
                className={`px-4 py-2 border rounded
                  ${available ? "bg-white" : "bg-gray-300 cursor-not-allowed"}
                  ${
                    selectedGrade === grade
                      ? "border-black font-semibold"
                      : "border-gray-400"
                  }
                `}
                disabled={!available}
              >
                {grade}
              </button>
            );
          })}

        </div>
      </div>

      {/* HARGA */}
      <div className="mt-6 text-xl font-semibold">
        {finalVariant ? (
          <p>Harga: Rp {finalVariant.price.toLocaleString("id-ID")}</p>
        ) : (
          <p>
            Harga: Rp{" "}
            {Math.min(...variants.map((v) => v.price)).toLocaleString("id-ID")}
          </p>
        )}
      </div>

      {/* STOK */}
      <div className="mt-2 text-md">
        {finalVariant ? (
          finalVariant.stock > 0 ? (
            <p>{finalVariant.stock} In Stock </p>
          ) : (
            <p className="text-red-600">Stok habis</p>
          )
        ) : (
          <p>Pilih size dan grades untuk melihat stok</p>
        )}
      </div>
      {/* Cart */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={addToCart}
          disabled={!finalVariant}
          className={`px-4 py-2 rounded text-white 
            ${finalVariant ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`}
        >
          Add to Cart
        </button>
      {/* WISHLIST */}
        <button
          onClick={toggleWishlist}
          className="px-4 py-2 rounded border border-gray-500"
        >
          Add To Wishlist
        </button>
      </div>
    </div>
  );
}
