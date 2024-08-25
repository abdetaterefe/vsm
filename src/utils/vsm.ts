function getUniqueTerms(documents: string[]) {
  const uniqueTerms = new Set<string>();
  documents.forEach((doc) => {
    doc
      .toLowerCase()
      .split(/\W+/)
      .filter((term) => term)
      .forEach((term) => uniqueTerms.add(term));
  });
  return Array.from(uniqueTerms);
}

function termFrequency(term: string, document: string) {
  const words = document
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word);
  return words.filter((word) => word === term).length;
}

function documentFrequency(term: string, documents: string[]) {
  return documents.filter((doc) =>
    doc.toLowerCase().split(/\W+/).includes(term)
  ).length;
}

function inverseDocumentFrequency(term: string, documents: string[]) {
  const df = documentFrequency(term, documents);
  if (!df) return 0;
  return Math.log10(documents.length / df);
}

export function calculateTFIDF(query: string, documents: string[]) {
  const uniqueTerms = getUniqueTerms([query, ...documents]);

  const tableData = uniqueTerms.map((term) => {
    const TF = {
      Q: termFrequency(term, query),
      D1: termFrequency(term, documents[0]),
      D2: termFrequency(term, documents[1]),
      D3: termFrequency(term, documents[2]),
      D4: termFrequency(term, documents[3]),
    };

    const DF = documentFrequency(term, documents);
    const IDF = inverseDocumentFrequency(term, documents).toFixed(4);

    const TF_IDF = {
      Q: (TF.Q * parseFloat(IDF)).toFixed(4),
      D1: (TF.D1 * parseFloat(IDF)).toFixed(4),
      D2: (TF.D2 * parseFloat(IDF)).toFixed(4),
      D3: (TF.D3 * parseFloat(IDF)).toFixed(4),
      D4: (TF.D4 * parseFloat(IDF)).toFixed(4),
    };

    // Determine which documents contain this term
    const containingDocs = [];
    if (TF.D1 > 0) containingDocs.push("D1");
    if (TF.D2 > 0) containingDocs.push("D2");
    if (TF.D3 > 0) containingDocs.push("D3");
    if (TF.D4 > 0) containingDocs.push("D4");

    return {
      term,
      TF,
      DF,
      IDF,
      TF_IDF,
      containingDocs: containingDocs.join(", "), // Join the document names into a string
    };
  });

  return tableData;
}

function vectorMagnitude(vector: number[]) {
  return Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0)
  ).toFixed(4);
}

function dotProduct(vector1: number[], vector2: number[]) {
  return vector1
    .reduce((sum, value, i) => sum + value * vector2[i], 0)
    .toFixed(4);
}

function createVector(TF_IDF: any, uniqueTerms: string[]) {
  return uniqueTerms.map((term) => parseFloat(TF_IDF[term] || 0));
}

function cosineSimilarity(queryVector: number[], documentVector: number[]) {
  const dotProd = parseFloat(dotProduct(queryVector, documentVector));
  const magnitudeQuery = parseFloat(vectorMagnitude(queryVector));
  const magnitudeDoc = parseFloat(vectorMagnitude(documentVector));
  return {
    similarityScore: (dotProd / (magnitudeQuery * magnitudeDoc)).toFixed(4),
    magnitudeQuery: magnitudeQuery,
  };
}

export function rankDocuments(documents: string[], tableData: any) {
  const uniqueTerms = tableData.map((item: any) => item.term);
  const queryVector = createVector(
    tableData.reduce((acc: any, item: any) => {
      acc[item.term] = item.TF_IDF.Q;
      return acc;
    }, {}),
    uniqueTerms
  );

  const similarities = documents.map((doc, index) => {
    const docVector = createVector(
      tableData.reduce((acc: any, item: any) => {
        acc[item.term] = item.TF_IDF[`D${index + 1}`];
        return acc;
      }, {}),
      uniqueTerms
    );
    const { magnitudeQuery, similarityScore } = cosineSimilarity(
      queryVector,
      docVector
    );

    const vectorLen = vectorMagnitude(docVector);
    const dotProd = dotProduct(queryVector, docVector);

    return {
      margitanQuery: magnitudeQuery,
      queryVectors: queryVector.filter((v) => v > 0),
      docIndex: index + 1,
      similarity: similarityScore,
      vector: docVector.filter((v) => v > 0),
      vectorLength: vectorLen,
      dotProducts: docVector
        .map((v, i) => {
          if (v > 0) {
            if (queryVector[i] > 0) {
              return [v, queryVector[i]];
            }
          }
        })
        .filter((v) => v),
      dotProduct: dotProd,
    };
  });

  return similarities.sort(
    (a, b) => parseFloat(b.similarity) - parseFloat(a.similarity)
  );
}
