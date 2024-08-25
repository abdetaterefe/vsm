import { html } from "hono/html";

export const post_head = html`<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
</head>`;
