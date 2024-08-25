import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { html } from "hono/html";
import { validator } from "hono/validator";

const app = new Hono();

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

function calculateTFIDF(query: string, documents: string[]) {
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

function rankDocuments(documents: string[], tableData: any) {
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

app.get("/", (c) => {
  return c.html(
    html`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>VSM</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              height: 100vh;
            }

            h1 {
              color: #333;
              text-align: center;
            }

            form {
              background-color: #fff;
              padding: 20px;
              border-radius: 8px;
              width: 100%;
            }

            label {
              display: block;
              margin-bottom: 10px;
              font-weight: bold;
              color: #555;
            }

            input[type="text"] {
              width: calc(100% - 24px);
              padding: 10px;
              margin-bottom: 20px;
              border: 1px solid #ddd;
              border-radius: 4px;
              box-sizing: border-box;
            }

            input[type="submit"] {
              background-color: #28a745;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            }

            input[type="submit"]:hover {
              background-color: #218838;
            }
          </style>
        </head>
        <body>
          <form method="POST" action="/">
            <h1>VSM</h1>
            <label for="query">Query:</label>
            <input type="text" id="query" name="query" required />

            <label for="document_1">Document 1:</label>
            <input type="text" id="document_1" name="document_1" required />

            <label for="document_2">Document 2:</label>
            <input type="text" id="document_2" name="document_2" required />

            <label for="document_3">Document 3:</label>
            <input type="text" id="document_3" name="document_3" required />

            <label for="document_4">Document 4:</label>
            <input type="text" id="document_4" name="document_4" required />

            <input type="submit" value="Calculate" />
          </form>
        </body>
      </html>`
  );
});

app.post(
  "/",
  validator("form", (value, c) => {
    const query = value["query"];
    const document_1 = value["document_1"];
    const document_2 = value["document_2"];
    const document_3 = value["document_3"];
    const document_4 = value["document_4"];

    if (
      !query ||
      typeof query !== "string" ||
      !document_1 ||
      typeof document_1 !== "string" ||
      !document_2 ||
      typeof document_2 !== "string" ||
      !document_3 ||
      typeof document_3 !== "string" ||
      !document_4 ||
      typeof document_4 !== "string"
    ) {
      return c.text("Invalid input!", 400);
    }

    return { query, document_1, document_2, document_3, document_4 };
  }),
  async (c) => {
    const { query, document_1, document_2, document_3, document_4 } =
      c.req.valid("form");

    const documents = [document_1, document_2, document_3, document_4];

    const tableData = calculateTFIDF(query, documents).sort((a, b) =>
      a.term.localeCompare(b.term)
    );
    const rankedDocs = rankDocuments(documents, tableData);

    const resultHtml = html`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>VSM</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f9f9f9;
              color: #333;
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: start;
            }

            h1,
            h2 {
              text-align: center;
              color: #444;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              background-color: #fff;
            }

            th,
            td {
              padding: 12px;
              border: 1px solid #ddd;
              text-align: center;
            }

            th {
              background-color: #4caf50;
              color: white;
            }

            tbody tr:nth-child(even) {
              background-color: #f2f2f2;
            }

            p {
              font-size: 16px;
              text-align: start;
            }

            table th,
            table td {
              border: 1px solid #ccc;
            }

            table tr:hover {
              background-color: #e0e0e0;
            }
          </style>
          <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
          <script
            id="MathJax-script"
            async
            src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          ></script>
        </head>
        <body>
          <h1>VSM Result</h1>

          <h2>Question</h2>
          <p><strong>Query:</strong> ${query}</p>

          <span><strong>Document D1:</strong> ${document_1}</span>
          <span><strong>Document D2:</strong> ${document_2}</span>
          <span><strong>Document D3:</strong> ${document_3}</span>
          <span><strong>Document D4:</strong> ${document_4}</span>

          <h2>1: Identify Unique Terms</h2>
          <p>
            Compile a list of all unique terms (tokens) that appear in the
            documents and the query
          </p>

          <h2>2: Calculate Term Frequencies</h2>
          <p>
            For each term in the query and each document, calculate the term
            frequency (TF) and document frequency (DF) of the term in the
            document.
          </p>

          <h2>3: Calculate Inverse Document Frequencies</h2>
          <p>
            Calculate the inverse document frequency (IDF) for each term in the
            query and each document.
          </p>
          <p>$$\\text{IDF}(t) = \\log_{10}\\left(\\frac{N}{n_t}\\right)$$</p>

          <p>Where:</p>
          <ul>
            <li>(N) is the total number of documents.</li>
            <li>(nt) is the number of documents containing the term (t).</li>
          </ul>

          <h2>4:Compute TF-IDF</h2>
          <p>
            Multiply the TF of each term in a document by its corresponding IDF
            to get the TF-IDF score for that term in that document.
          </p>

          <table>
            <thead>
              <tr>
                <th rowspan="2">Terms</th>
                <th rowspan="2">Q</th>
                <th colspan="4">Counts TF</th>
                <th rowspan="2">DF</th>
                <th rowspan="2">IDF</th>
                <th colspan="5">W<sub>i</sub> = TF * IDF</th>
              </tr>
              <tr>
                <th>D1</th>
                <th>D2</th>
                <th>D3</th>
                <th>D4</th>
                <th>Q</th>
                <th>D1</th>
                <th>D2</th>
                <th>D3</th>
                <th>D4</th>
              </tr>
            </thead>
            <tbody>
              ${tableData.map(
                (row) => html`
                  <tr>
                    <td>${row.term}</td>
                    <td>${row.TF.Q}</td>
                    <td>${row.TF.D1}</td>
                    <td>${row.TF.D2}</td>
                    <td>${row.TF.D3}</td>
                    <td>${row.TF.D4}</td>
                    <td>${row.DF}</td>
                    <td>${row.IDF}</td>
                    <td>${row.TF_IDF.Q}</td>
                    <td>${row.TF_IDF.D1}</td>
                    <td>${row.TF_IDF.D2}</td>
                    <td>${row.TF_IDF.D3}</td>
                    <td>${row.TF_IDF.D4}</td>
                  </tr>
                `
              )}
            </tbody>
          </table>

          <h2>5: Compute Vector Magnitudes</h2>
          <p>$$\\text{Magnitude} = \\sqrt{\\sum{(tf\\text{-}idf_i)^2}}$$</p>

          <span>
            $$ \\text{|q|} =
            \\sqrt{${rankedDocs[0].queryVectors.map((v) => `(${v})^2 +`)}} =
            ${rankedDocs[0].margitanQuery}$$
          </span>
          <span>
            $$ \\text{|d${rankedDocs[0].docIndex}|} =
            \\sqrt{${rankedDocs[0].vector.map((v) => `(${v})^2 +`)}} =
            ${rankedDocs[0].vectorLength}$$
          </span>
          <span>
            $$ \\text{|d${rankedDocs[1].docIndex}|} =
            \\sqrt{${rankedDocs[1].vector.map((v) => `(${v})^2 +`)}} =
            ${rankedDocs[1].vectorLength}$$
          </span>
          <span>
            $$ \\text{|d${rankedDocs[2].docIndex}|} =
            \\sqrt{${rankedDocs[2].vector.map((v) => `(${v})^2 +`)}} =
            ${rankedDocs[2].vectorLength}$$
          </span>
          <span>
            $$ \\text{|d${rankedDocs[3].docIndex}|} =
            \\sqrt{${rankedDocs[3].vector.map((v) => `(${v})^2 +`)}} =
            ${rankedDocs[3].vectorLength}$$
          </span>

          <h2>6: Compute Dot Products</h2>
          <p>$$\\text{Dot Product}(q, d) = \\sum{(q_i \\cdot d_i)}$$</p>

          <span
            >$$ \\text{Q*d${rankedDocs[0].docIndex}} =
            ${rankedDocs[0].dotProducts.map(
              (p) => `${p![0]} \\times ${p![1]} +`
            )}
            = ${rankedDocs[0].dotProduct} $$</span
          >
          <span
            >$$ \\text{Q*d${rankedDocs[1].docIndex}} =
            ${rankedDocs[1].dotProducts.map(
              (p) => `${p![0]} \\times ${p![1]} +`
            )}
            = ${rankedDocs[1].dotProduct} $$</span
          >
          <span
            >$$ \\text{Q*d${rankedDocs[2].docIndex}} =
            ${rankedDocs[2].dotProducts.map(
              (p) => `${p![0]} \\times ${p![1]} +`
            )}
            = ${rankedDocs[2].dotProduct} $$</span
          >
          <span
            >$$ \\text{Q*d${rankedDocs[3].docIndex}} =
            ${rankedDocs[3].dotProducts.map(
              (p) => `${p![0]} \\times ${p![1]} +`
            )}
            = ${rankedDocs[3].dotProduct} $$</span
          >

          <h2>7: Calculate Cosine Similarity</h2>
          <p>
            $$\\text{Cosine Similarity}(q, d) = \\frac{\\text{Dot Product}(q,
            d)}{\\text{Magnitude}(q) \\times \\text{Magnitude}(d)}$$
          </p>

          <span
            >$$ Rank 1: Sim(q,d${rankedDocs[0].docIndex}) =
            \\frac{${rankedDocs[0].dotProduct}}{${rankedDocs[0].margitanQuery}
            \\times ${rankedDocs[0].vectorLength}} =
            ${rankedDocs[0].similarity}$$</span
          >

          <span
            >$$ Rank 2: Sim(q,d${rankedDocs[1].docIndex}) =
            \\frac{${rankedDocs[1].dotProduct}}{${rankedDocs[0].margitanQuery}
            \\times ${rankedDocs[1].vectorLength}} =
            ${rankedDocs[1].similarity}$$</span
          >

          <span
            >$$ Rank 3: Sim(q,d${rankedDocs[2].docIndex}) =
            \\frac{${rankedDocs[2].dotProduct}}{${rankedDocs[0].margitanQuery}
            \\times ${rankedDocs[2].vectorLength}} =
            ${rankedDocs[2].similarity}$$</span
          >

          <span
            >$$ Rank 4: Sim(q,d${rankedDocs[3].docIndex}) =
            \\frac{${rankedDocs[3].dotProduct}}{${rankedDocs[0].margitanQuery}
            \\times ${rankedDocs[3].vectorLength}} =
            ${rankedDocs[3].similarity}$$</span
          >
        </body>
      </html> `;

    return c.html(resultHtml);
  }
);

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
