import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { imageAtWidth, imageSrcSet, imageUrlIssue, visualClass } from "../utils/imageUrls";

const formatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0
});

function MenuCard({ item, compact = false, onAddToCart }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = item.image && !imageUrlIssue(item.image) && !imageFailed;

  return (
    <article className={compact ? "menu-card compact" : "menu-card"}>
      <div className="menu-image">
        {hasImage ? (
          <img
            src={imageAtWidth(item.image, compact ? 960 : 1280)}
            srcSet={imageSrcSet(item.image)}
            sizes={compact ? "(min-width: 900px) 31vw, 100vw" : "(min-width: 900px) 33vw, 100vw"}
            alt={item.alt || item.name}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={visualClass(item.category)}>
            <span>{item.category || "NOFFELO"}</span>
          </div>
        )}
        {item.featured ? (
          <span className="featured-pill">
            <Sparkles size={14} />
            Featured
          </span>
        ) : null}
      </div>
      <div className="menu-card-body">
        <div className="menu-title-row">
          <h3>{item.name}</h3>
          <strong>{formatter.format(item.price || 0)}</strong>
        </div>
        <p>{item.description}</p>
        <div className="tag-row">
          {(item.tags || []).slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {onAddToCart ? (
          <button className="button primary compact-button menu-add-button" type="button" onClick={() => onAddToCart(item)}>
            <Plus size={16} />
            Add to cart
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default MenuCard;
