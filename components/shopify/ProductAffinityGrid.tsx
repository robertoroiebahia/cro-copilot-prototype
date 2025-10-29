'use client';

interface ProductAffinity {
  product_a_id: string;
  product_a_title: string;
  product_b_id: string;
  product_b_title: string;
  co_occurrence_count: number;
  confidence: number;
  lift: number;
}

interface ProductAffinityGridProps {
  affinities: ProductAffinity[];
}

export function ProductAffinityGrid({ affinities }: ProductAffinityGridProps) {
  if (!affinities || affinities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white border-2 border-gray-200 rounded-lg">
        <div className="mb-2 font-bold">No product pairings found</div>
        <div className="text-sm">
          This usually means customers don&apos;t buy multiple products in the same order.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-2 border-gray-200 rounded-lg p-5 bg-white">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
          Products Frequently Bought Together
        </div>
        <div className="text-base text-gray-600">
          {affinities.length} product pairs with strong purchasing correlation
        </div>
      </div>

      {/* Grid of Product Pairs */}
      <div className="space-y-3">
        {affinities.map((affinity, index) => {
          // Determine strength of association
          const isVeryStrong = affinity.lift >= 3;
          const isStrong = affinity.lift >= 2 && affinity.lift < 3;

          return (
            <div
              key={`${affinity.product_a_id}-${affinity.product_b_id}`}
              className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-brand-gold/50 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Products */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-gold text-brand-black font-black text-xs">
                      {index + 1}
                    </span>
                    {isVeryStrong && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded">
                        VERY STRONG
                      </span>
                    )}
                    {isStrong && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded">
                        STRONG
                      </span>
                    )}
                  </div>

                  {/* Product Names */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-bold text-brand-black line-clamp-1">
                        {affinity.product_a_title}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 font-medium pl-4">
                      +
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-bold text-brand-black line-clamp-1">
                        {affinity.product_b_title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6">
                  {/* Co-occurrences */}
                  <div className="text-center">
                    <div className="text-2xl font-black text-brand-black">
                      {affinity.co_occurrence_count}
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Times
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      bought together
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="text-center">
                    <div className="text-2xl font-black text-blue-600">
                      {(affinity.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Confidence
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      likelihood
                    </div>
                  </div>

                  {/* Lift */}
                  <div className="text-center">
                    <div className={`text-2xl font-black ${
                      isVeryStrong ? 'text-red-600' :
                      isStrong ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {affinity.lift.toFixed(1)}x
                    </div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Lift
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      correlation
                    </div>
                  </div>
                </div>
              </div>

              {/* Insight */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-600">
                  <span className="font-bold">💡 Recommendation:</span>
                  {' '}
                  {affinity.lift >= 2 ? (
                    <>Create a bundle or show as &quot;frequently bought together&quot; on product pages. This pair has {affinity.lift.toFixed(1)}x higher correlation than random.</>
                  ) : (
                    <>Consider cross-selling these items together in cart or checkout.</>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="text-xs font-bold text-blue-900 mb-2">
          📊 How to read these metrics:
        </div>
        <ul className="text-xs text-blue-800 space-y-1">
          <li><span className="font-bold">Confidence:</span> The likelihood that product B is purchased when product A is in the cart</li>
          <li><span className="font-bold">Lift:</span> How much more likely these products are bought together vs. random chance (2x = twice as likely)</li>
          <li><span className="font-bold">Higher lift = stronger correlation</span> between products</li>
        </ul>
      </div>
    </div>
  );
}
