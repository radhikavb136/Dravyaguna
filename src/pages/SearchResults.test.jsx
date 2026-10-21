import { describe, expect, it } from "vitest"
import { prepareApiResultsForCards } from "../utils/searchResults"

describe("prepareApiResultsForCards", () => {
  it("passes API herb fields and match percentage directly to result cards", () => {
    const [cardHerb] = prepareApiResultsForCards([
      { id: "herb-1", englishName: "Guduchi", matchPercentage: 72 },
    ], "hi-IN")

    expect(cardHerb).toMatchObject({
      id: "herb-1",
      englishName: "Guduchi",
      match: 72,
      displayLanguage: "hi-IN",
    })
    expect(cardHerb.herb).toBeUndefined()
  })
})
