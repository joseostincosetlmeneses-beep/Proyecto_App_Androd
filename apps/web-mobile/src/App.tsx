import React,{useState} from 'react';
import { SafeAreaView,Text,View,StyleSheet } from 'react-native';
import { DataGrid } from './components/DataGrid/DataGrid';
import { CommandPalette } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
const rows=Array.from({length:1000},(_,index)=>({id:String(index),sku:`SKU-${index+1}`,name:`Producto ${index+1}`,stock:index%37}));
export default function App(){const [paletteOpen,setPaletteOpen]=useState(false); useKeyboardShortcuts(()=>setPaletteOpen(true)); return <SafeAreaView style={styles.screen}><View style={styles.header}><Text style={styles.title}>ERP Universal</Text><Text style={styles.subtitle}>Inventario</Text></View><DataGrid rows={rows} columns={[{key:'sku',title:'SKU'},{key:'name',title:'Producto'},{key:'stock',title:'Stock'}]}/><CommandPalette visible={paletteOpen} onClose={()=>setPaletteOpen(false)}/></SafeAreaView>}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#f4f7f8'},header:{padding:24,backgroundColor:'#123047'},title:{fontSize:26,fontWeight:'700',color:'white'},subtitle:{color:'#a9d6c9',marginTop:4}});
