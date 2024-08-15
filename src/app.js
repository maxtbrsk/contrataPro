import express from "express";
import conexao from "./app/database/conexao.js";
import jwt from 'jsonwebtoken'; 
import bcrypt from 'bcryptjs'


const app = express();
app.use(express.json());


// Função auxiliar para inserir endereço
async function insertEndereco(endereco, usuarioId, conexao) {
  console.log("entrou no endereço")
  return new Promise((resolve, reject) => {
    const sqlEndereco = "INSERT INTO endereco (rua, numero, complemento, bairro, cidade, idUsuario) VALUES (?, ?, ?, ?, ?, ?)";
    conexao.query(sqlEndereco, [endereco.rua, endereco.numero, endereco.complemento, endereco.bairro, endereco.cidade, usuarioId], (erro, resultado) => {
      if (erro) {
        console.log("erro ao registrar endereço")
        console.log(erro)
        return reject(erro);
      }
      console.log("registrou endereço")
      resolve(resultado);
    });
  });
}


//ROTAS

app.post("/registerCliente", async (req, res) => {
  const dados = req.body;
  const usuario = {
    email: dados.email,
    nome: dados.nome,
    senha: dados.senha,
  }
  const endereco = {
    rua: dados.rua,
    numero: dados.rua,
    complemento: dados.complemento,
    bairro: dados.bairro,
    cidade: dados.cidade
  }

 console.log(dados);
  // Verifica se os dados necessários estão presentes
  if (!usuario || !endereco) {
    return res.status(400).json({ erro: "Dados do usuário e do endereço são obrigatórios." });
  }

  // Inicia a transação
  conexao.beginTransaction(async (err) => {
    console.log("entrou na transação")
    if (err) {
      return res.status(500).json({ erro: "Erro ao iniciar transação." });
    }

    try {
      // Insere o usuário
      const sqlUsuario = "INSERT INTO usuario SET ?";
      const resultadoUsuario = await new Promise((resolve, reject) => {
        conexao.query(sqlUsuario, usuario, (erro, resultado) => {
          if (erro) {
            console.log("erro ao inserir usuario")
            return reject(erro);
          }
          resolve(resultado);
          console.log("inseriu usuário")
        });
      });

      const idUsuario = resultadoUsuario.insertId;
      console.log(idUsuario);
      // Insere o endereço
      await insertEndereco(endereco, idUsuario, conexao);

      // Faz o commit da transação
      conexao.commit((err) => {
        if (err) {
          return conexao.rollback(() => {
            res.status(500).json({ erro: "Erro ao fazer commit da transação." });
          });
        }
        res.status(201).json({ mensagem: "Usuário registrado com sucesso." });
      });
    } catch (erro) {
      // Faz rollback em caso de erro
      conexao.rollback(() => {
        res.status(500).json({ erro: "Erro ao processar a solicitação." });
      });
    }
  });
});


// ROTA PARA REGISTRAR PRESTADOR

app.post("/registerPrestador", async (req, res) => {
  const dados = req.body;
  const usuario = {
    email: dados.email,
    nome: dados.nome,
    senha: dados.senha,
    CPF: dados.cpf,
    atuacao: dados.atuacao
  }
  const endereco = {
    rua: dados.rua,
    numero: dados.rua,
    complemento: dados.complemento,
    bairro: dados.bairro,
    cidade: dados.cidade
  }

  conexao.beginTransaction(async (err) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao iniciar transação." });
    }

    // Inserindo o usuário
    const sqlUsuario =
      "INSERT INTO usuario (email, nome, senha) VALUES (?, ?, ?)";
    conexao.query(
      sqlUsuario,
      [usuario.email, usuario.nome, usuario.senha],
      (erro, resultadoUsuario) => {
        if (erro) {
          return conexao.rollback(() => {
            res.status(404).json({ erro: erro });
          });
        }

        const idUsuario = resultadoUsuario.insertId;

        // Inserindo o prestador usando o idUsuario
        const sqlPrestador =
          "INSERT INTO Prestador (CPF, atuacao, idUsuario) VALUES (?, ?, ?)";
        conexao.query(
          sqlPrestador,
          [usuario.CPF, usuario.atuacao, idUsuario],
          async (erro, resultadoPrestador) => {
            if (erro) {
              return conexao.rollback(() => {
                res.status(404).json({ erro: erro });
              });
            }

            await insertEndereco(endereco, idUsuario, conexao);

            // Commit da transação
            conexao.commit((err) => {
              if (err) {
                return conexao.rollback(() => {
                  res
                    .status(500)
                    .json({ erro: "Erro ao fazer commit da transação." });
                });
              }
              res.status(201).json({
                mensagem: "Usuário Prestador registrado com sucesso.",
              });
            });
          }
        );
      }
    );
  });
});

app.post("/login", async (req, res) => {
    const { email, senha } = req.body;
  
    if (!email || !senha) {
      return res.status(400).json({ erro: "Email e senha são obrigatórios." });
    }
  
    const sql = "SELECT * FROM usuario WHERE email = ? AND senha = ?";
    
    // Usando uma função async dentro do callback do query
    conexao.query(sql, [email, senha], async (erro, resultados) => {
      if (erro) {
        return res.status(500).json({ erro: "Erro no servidor." });
      }
  
      if (resultados.length > 0) {
        // Usuário encontrado, login bem-sucedido
        const usuario = resultados[0];
        try {
          // Geração do token JWT com await
          const token = await generateJWT(usuario.id, 'perola');
          res.status(200).json({ mensagem: "Login realizado com sucesso.", token });
        } catch (erro) {
          res.status(500).json({ erro: "Erro ao gerar o token." });
        }
      } else {
        // Usuário não encontrado ou senha incorreta
        res.status(401).json({ erro: "Email ou senha incorretos." });
      }
    });
  });



export async function generateJWT(id, secret) {
    const jwtToken = jwt.sign({ id }, secret , { expiresIn: '7d' }); 
    return jwtToken;
}

export async function verifyJWT(jwtToken, secret) {
    const decoded = jwt.verify(jwtToken, secret);
    return decoded;
}

export async function decrypt(password, encryptedPassword) {
    const result = bcrypt.compareSync(password, encryptedPassword);
    return result;
}

export default app;
