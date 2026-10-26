import copy
from app.config import CONTRACT, ROOT

P = "/api/v1"


def test_unknown_layout_variants_and_patterns_are_rejected(client, user):
    me = client.get(P + "/me", headers=user["headers"]).json()
    shop_id = me["shop"]["id"]
    theme = client.get(P + "/themes").json()["items"][0]
    for mutate in (
        lambda d: d["sections"][0]["children"][1]["props"].update(variant="spinning"),
        lambda d: d["sections"][0]["children"][1]["style"].update(pattern="plaid"),
        lambda d: d["sections"][0]["children"][1]["style"].update(fontFamily="Comic Sans MS"),
        lambda d: d["sections"][0]["children"][1]["style"].update(shape="blob"),
    ):
        doc = copy.deepcopy(theme["document"])
        doc["shopId"] = shop_id
        mutate(doc)
        draft = client.get(f"{P}/shops/{shop_id}/draft", headers=user["headers"]).json()
        r = client.patch(
            f"{P}/shops/{shop_id}/draft",
            headers={**user["headers"], "If-Match": str(draft["revision"])},
            json={"document": doc, "baseRevision": draft["revision"], "clientMutationId": "bad"},
        )
        assert r.status_code == 422, r.text


def test_bundled_contract_matches_the_shared_package():
    """The API ships copies of the schema and templates; they must never drift from packages/storefront-schema."""
    shared = ROOT / "packages/storefront-schema"
    assert (CONTRACT / "storefront.v1.json").read_text() == (shared / "storefront.v1.json").read_text()
    assert (CONTRACT / "themes.json").read_text() == (shared / "fixtures/themes.json").read_text()
