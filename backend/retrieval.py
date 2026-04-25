from qdrant_client.models import (Filter, FieldCondition, MatchValue, Range,
                                  Prefetch, Query, Fusion, NamedVector, NamedSparseVector, SparseVector)
from qdrant_client import QdrantClient
from ingestion import embed, build_sparse_vector
from models import NormalizedProfile
from config import settings


def build_filter(filters: dict | None) -> Filter | None:
    if not filters:
        return None

    conditions = []

    if seniority := filters.get("seniority"):
        conditions.append(
            FieldCondition(key="seniority", match=MatchValue(value=seniority))
        )

    if location := filters.get("location"):
        conditions.append(
            FieldCondition(key="location", match=MatchValue(value=location))
        )

    if min_years := filters.get("min_years_experience"):
        conditions.append(
            FieldCondition(key="years_experience", range=Range(gte=min_years))
        )

    if filters.get("open_to_remote") is True:
        conditions.append(
            FieldCondition(key="open_to_remote", match=MatchValue(value=True))
        )

    return Filter(must=conditions) if conditions else None


qdrant = QdrantClient(url=settings.qdrant_url)


def hybrid_search(
    dense_vector: list[float],
    sparse_vector: SparseVector,
    query_filter: Filter | None,
    top_k: int = 20,
) -> list:
    results = qdrant.query_points(
        collection_name=settings.qdrant_collection,
        prefetch=[
            Prefetch(
                query=NamedVector(name="dense", vector=dense_vector),
                using="dense",
                filter=query_filter,
                limit=top_k * 2,   # fetch more, RRF will trim
            ),
            Prefetch(
                query=NamedSparseVector(
                    name="sparse",
                    vector=sparse_vector,
                ),
                using="sparse",
                filter=query_filter,
                limit=top_k * 2,
            ),
        ],
        query=Query(fusion=Fusion.RRF),
        limit=top_k,
        with_payload=True,
    )
    return results.points


def retrieve(
    jd: NormalizedProfile,
    filters: dict | None = None,
    top_k: int = 20,
) -> list:
    dense_vector = embed(jd.summary)
    sparse_vector = build_sparse_vector(jd)
    query_filter = build_filter(filters)

    return hybrid_search(dense_vector, sparse_vector, query_filter, top_k)
