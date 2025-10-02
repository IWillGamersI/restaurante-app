import DashBoard from "@/components/DashBoard";
import Head from "next/head";


export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Login Cliente - Top Pizzas</title>
        <meta name="description" content="Área de login da Top Pizzas" />
        <link rel="manifest" href="/manifest-estabelecimento.json" />
        <meta name="theme-color" content="#1976d2" />
      </Head>
    <DashBoard/>
    </>
   );
}
