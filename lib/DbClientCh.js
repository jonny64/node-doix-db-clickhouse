const http = require ('http')
const EventEmitter  = require ('events')
const {randomUUID}  = require ('crypto')
const DbRecordReaderCh = require ('./DbRecordReaderCh.js')

class DbClientPg extends EventEmitter {

	constructor (pool) {
	
		super ()

		this.pool = pool
		
		this.uuid = randomUUID ()
	
	}
	
	release () {
		
	}

	async getStream (sql, params = [], options = {}) {

		const {rowMode} = options, {lang} = this

		const res = await this.do (sql + ' FORMAT JSONCompactEachRowWithNamesAndTypes', params, {keep: true})

		return res.pipe (new DbRecordReaderCh ({rowMode, lang}))

	}

	async do (sql, params = [], options = {}) {
	
		const {pool} = this, {url, agent} = pool
		
		try {

			this.emit ('start', this, {sql, params})

			const result = await new Promise ((ok, fail) => {

				const req = http.request (url, {...pool.options, method: 'POST'}, res => {

					res.once ('close', () => this.emit ('finish'))

					const {statusCode} = res; if (statusCode == 200) return ok (res)

					const err = new Error (res.statusMessage)
					
					err.code = statusCode
					err.response = res

					fail (err)

				})
				
				req.write (this.lang.bindParams (sql, params))

				req.end ()

			})
			
			if (options.keep) return result
			
			result.destroy ()
			
			result.emit ('close') // https://github.com/nodejs/node/issues/40528
			
		}
		catch (cause) {
		
			const {response} = cause
			
			response.setEncoding ('utf8')
			
			let {message} = response; for await (const s of response) message += s

			const e = new Error (message)

			this.emit ('error', this, e)

			throw Error ('ClickHouse server returned an error: ' + message, {cause})

		}

	}

}

module.exports = DbClientPg