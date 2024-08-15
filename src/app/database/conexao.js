import mysql from 'mysql'

const conexao = mysql.createConnection({
    host: 'mysql.infocimol.com.br',
    port: '3306',
    user: 'infocimol06',
    password: 'M68591205',
    database: 'infocimol06'
})

conexao.connect()

export default conexao