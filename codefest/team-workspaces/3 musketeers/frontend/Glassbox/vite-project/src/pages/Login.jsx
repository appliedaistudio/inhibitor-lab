import React from 'react'
import { Link } from 'react-router'
import { useState, useContext } from 'react'




let userID;
const Login = () => {
    const [inputValue, setRecValue] = useState("");
    const handleChange = (e) => {
        setRecValue(e.target.value);
    }
  return (
    
    <div className='min-h-screen grid place-items-center h-screen'>
        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4  ">
            <legend className="fieldset-legend">Login</legend>

                <label className="label">Enter UserId</label>
                <input type="text" className="input" required placeholder="UserId" value={inputValue} onChange={handleChange}/>
              

                <Link to={"/Data"} className="btn btn-primary mt-4">
                <spam>Get Data</spam>
                </Link>
</fieldset>
   
        
</div>
  

  )
   userID = useContext(inputValue);
}


export default Login
export { userID };