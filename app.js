
"use strict";
const SUPABASE_FUNCTION_URL = "https://bjajdjsbjitqjfhlvtjp.supabase.co/functions/v1/smart-endpoint";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_a9jIspNqtiAsmCn0yeic6A_OK4Ppd4R";
const form = document.getElementById("formCadastro");
const cargoInput = document.getElementById("cargo");
const regiaoInput = document.getElementById("regiao");
const grupoRegiao = document.getElementById("grupoRegiao");
const cpfInput = document.getElementById("cpf");
const emailInput = document.getElementById("email");
const arquivoInput = document.getElementById("carta");
const mensagem = document.getElementById("mensagem");
const erroCpf = document.getElementById("erroCpf");
const erroEmail = document.getElementById("erroEmail");

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png"
];

// Mostra a região apenas para cargos REGIONAL e DISTRITAL.
function atualizarRegiao() {
  const exigeRegiao = ["REGIONAL", "DISTRITAL"].includes(
    cargoInput.value
  );

  grupoRegiao.classList.toggle("oculto", !exigeRegiao);
  regiaoInput.disabled = !exigeRegiao;
  regiaoInput.required = exigeRegiao;

  if (!exigeRegiao) {
    regiaoInput.value = "";
  }
}

cargoInput.addEventListener("change", atualizarRegiao);

// Mantém o campo correto quando a página é carregada.
atualizarRegiao();

// Retira caracteres que não são números.
function somenteNumeros(valor) {
  return valor.replace(/\D/g, "");
}

// Formata o CPF enquanto o usuário digita.
cpfInput.addEventListener("input", function () {
  let cpf = somenteNumeros(cpfInput.value).slice(0, 11);

  if (cpf.length > 9) {
    cpf = cpf.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{0,2})$/,
      "$1.$2.$3-$4"
    );
  } else if (cpf.length > 6) {
    cpf = cpf.replace(
      /^(\d{3})(\d{3})(\d{0,3})$/,
      "$1.$2.$3"
    );
  } else if (cpf.length > 3) {
    cpf = cpf.replace(
      /^(\d{3})(\d{0,3})$/,
      "$1.$2"
    );
  }

  cpfInput.value = cpf;
  erroCpf.textContent = "";
});

// Valida os dígitos verificadores do CPF.
function validarCPF(valor) {
  const cpf = somenteNumeros(valor);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  function calcularDigito(base, pesoInicial) {
    let soma = 0;

    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  const primeiroDigito = calcularDigito(cpf.slice(0, 9), 10);
  const segundoDigito = calcularDigito(
    cpf.slice(0, 9) + primeiroDigito,
    11
  );

  return (
    Number(cpf[9]) === primeiroDigito &&
    Number(cpf[10]) === segundoDigito
  );
}

// Verificação básica do formato do e-mail.
function validarEmail(valor) {
  const email = valor.trim();

  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

emailInput.addEventListener("input", function () {
  erroEmail.textContent = "";
});

// Exibe a mensagem de resultado.
function mostrarMensagem(texto, sucesso) {
  mensagem.textContent = texto;
  mensagem.classList.toggle("sucesso", sucesso);
  mensagem.classList.toggle("falha", !sucesso);
}

// Valida o anexo.
function validarArquivo(arquivo) {
  if (!arquivo) {
    return "Anexe a carta de recomendação.";
  }

  if (arquivo.size > TAMANHO_MAXIMO) {
    return "O arquivo deve ter no máximo 5 MB.";
  }

  if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
    return "Formato inválido. Envie um arquivo PDF, JPG ou PNG.";
  }

  return "";
}

// Validação e envio do formulário.
form.addEventListener("submit", async function (event) {
  event.preventDefault();

  mensagem.textContent = "";
  mensagem.className = "";
  erroCpf.textContent = "";
  erroEmail.textContent = "";

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!validarCPF(cpfInput.value)) {
    erroCpf.textContent = "CPF inválido. Confira os números.";
    cpfInput.focus();
    mostrarMensagem("Corrija os campos indicados.", false);
    return;
  }

  if (!validarEmail(emailInput.value)) {
    erroEmail.textContent = "Informe um e-mail válido.";
    emailInput.focus();
    mostrarMensagem("Corrija os campos indicados.", false);
    return;
  }

  const arquivo = arquivoInput.files[0];
  const erroArquivo = validarArquivo(arquivo);

  if (erroArquivo) {
    mostrarMensagem(erroArquivo, false);
    arquivoInput.focus();
    return;
  }

  const exigeRegiao = ["REGIONAL", "DISTRITAL"].includes(
    cargoInput.value
  );

  if (exigeRegiao && !regiaoInput.value) {
    mostrarMensagem("Selecione uma região para este cargo.", false);
    regiaoInput.focus();
    return;
  }

  const botao = document.getElementById("btnEnviar");
  const textoOriginal = botao.textContent;

  botao.disabled = true;
  botao.textContent = "Enviando...";
  
  try {
    const base64 = await new Promise((resolve, reject) => {
      const leitor = new FileReader();

      leitor.onload = () => {
        const resultado = String(leitor.result);
        resolve(resultado.split(",")[1]);
      };

      leitor.onerror = () => {
        reject(new Error("Não foi possível ler o arquivo."));
      };

      leitor.readAsDataURL(arquivo);
    });

    const payload = {
      departamento: document.getElementById("departamento").value,
      distrito: document.getElementById("distrito").value,
      cargo: cargoInput.value,
      regiao: regiaoInput.value || null,
      nome_completo: document.getElementById("nome").value.trim(),
      cpf: somenteNumeros(cpfInput.value),
      email: emailInput.value.trim().toLowerCase(),
      consentimento: document.getElementById("consentimento").checked,
      arquivo: {
        nome: arquivo.name,
        mimeType: arquivo.type,
        base64: base64
      }
    };

    const resposta = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(payload)
    });

    const resultado = await resposta.json();

    if (!resposta.ok || resultado.sucesso !== true) {
      throw new Error(
        resultado.erro || resultado.mensagem ||
        "Não foi possível realizar o cadastro."
      );
    }

    if (resultado.planilhaSincronizada) {
      mostrarMensagem(
        "Cadastro realizado com sucesso! Os dados foram enviados.",
        true
      );
    } else {
      mostrarMensagem(
        "Cadastro salvo, mas a sincronização da planilha precisa ser verificada.",
        true
      );
    }

    form.reset();
    atualizarRegiao();

  } catch (erro) {
    console.error("Erro no envio:", erro);
    mostrarMensagem(
      erro.message || "Erro ao enviar o cadastro. Tente novamente.",
      false
    );
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
});