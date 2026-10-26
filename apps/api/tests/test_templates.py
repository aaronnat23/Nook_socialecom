import copy

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
