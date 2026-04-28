/**
 * Motor de Simulação de Ensalamento
 */

export class SimulationEngine {
  constructor(rooms, classes, existingEntries) {
    this.rooms = rooms; // Active rooms
    this.classes = classes; // Map of classes
    this.existingEntries = existingEntries; // Array of calendarEntries
  }

  getRequiredCapacity(targetClasses) {
    return targetClasses.reduce((sum, turma) => sum + Number(turma.studentCount || 0), 0);
  }

  isRoomAvailable(roomId, weekday, periods) {
    return !this.existingEntries.some(entry => {
      if (!entry.active) return false;
      if (entry.weekday !== weekday) return false;
      if (entry.roomId !== roomId) return false;

      const entryPeriods = entry.periods || [];
      return entryPeriods.some(p => periods.includes(p));
    });
  }

  areClassesAvailable(classIds, weekday, periods) {
    return !this.existingEntries.some(entry => {
      if (!entry.active) return false;
      if (entry.weekday !== weekday) return false;
      
      const entryClassIds = entry.classIds || [entry.classId];
      if (!entryClassIds.some(id => classIds.includes(id))) return false;

      const entryPeriods = entry.periods || [];
      return entryPeriods.some(p => periods.includes(p));
    });
  }

  scoreRoom(room, requiredCapacity, lesson, context) {
    if (!room || !room.active) return { valid: false, score: -999, reasons: ["Sala inativa ou inválida"] };

    if (Number(room.capacity || 0) < requiredCapacity) {
      return { valid: false, score: -999, reasons: ["Capacidade insuficiente"] };
    }

    if (lesson.requiredRoomType && room.type !== lesson.requiredRoomType) {
      return { valid: false, score: -999, reasons: ["Tipo de sala incompatível"] };
    }

    const roomResources = room.resources || [];
    const missingResources = (lesson.requiredResources || []).filter(r => !roomResources.includes(r));

    if (missingResources.length > 0) {
      return { valid: false, score: -999, reasons: ["Recursos obrigatórios ausentes"] };
    }

    const extraSeats = Number(room.capacity || 0) - requiredCapacity;
    let score = 20;
    const reasons = ["Sala comporta a turma"];

    if (extraSeats <= 5) {
      score += 15;
      reasons.push("Capacidade muito próxima da necessidade");
    } else if (extraSeats <= 15) {
      score += 10;
      reasons.push("Boa relação entre capacidade e alunos");
    } else if (extraSeats > requiredCapacity) {
      score -= 5;
      reasons.push("Sala muito maior que a necessidade");
    }

    if (context.preferredRoomId && room.id === context.preferredRoomId) {
      score += 10;
      reasons.push("Sala preferida atendida");
    }

    if (context.previousRoomIds && context.previousRoomIds.includes(room.id)) {
      score += 8;
      reasons.push("Mantém a mesma sala da turma");
    }

    return { valid: true, score, reasons };
  }

  findBestSlot(targetClasses, lesson, usedSlots, context) {
    const classIds = targetClasses.map(t => t.id);
    const requiredCapacity = this.getRequiredCapacity(targetClasses);
    
    let bestSlot = null;
    let maxScore = -9999;
    
    let weekdays = [1, 2, 3, 4, 5, 6].sort(() => 0.5 - Math.random());

    for (const day of weekdays) {
      // 1. Validar se turma está livre
      const isClassFreeLocally = lesson.periods.every(p => !usedSlots.has(`${day}-${p}`));
      if (!isClassFreeLocally) continue;
      
      const isClassFreeGlobally = this.areClassesAvailable(classIds, day, lesson.periods);
      if (!isClassFreeGlobally) continue;

      if (lesson.classType === 'ead' || lesson.classType === 'carga_reservada') {
        const score = 15;
        if (score > maxScore) {
            maxScore = score;
            bestSlot = {
                weekday: day,
                roomId: null,
                roomName: null,
                score,
                reasons: ["Aula não presencial (não requer sala)"],
                warnings: []
            };
        }
        continue;
      }

      // Presencial
      const selectionMode = lesson.roomSelectionMode || "auto";
      const selectedRoomId = lesson.selectedRoomId;
      let candidateRooms = [];
      let warnings = [];

      if (selectionMode === "required") {
         if (!selectedRoomId) {
            warnings.push("Modo 'obrigatório' mas nenhuma sala foi selecionada.");
         } else {
            const room = this.rooms.find(r => r.id === selectedRoomId);
            candidateRooms = room ? [room] : [];
         }
      } else if (selectionMode === "preferred") {
         if (selectedRoomId) {
            const prefRoom = this.rooms.find(r => r.id === selectedRoomId);
            if (prefRoom && this.isRoomAvailable(prefRoom.id, day, lesson.periods)) {
               candidateRooms = [prefRoom];
            } else {
               warnings.push("A sala preferida estava ocupada, por isso foi sugerida outra sala.");
               candidateRooms = this.rooms.filter(r => this.isRoomAvailable(r.id, day, lesson.periods));
            }
         } else {
            candidateRooms = this.rooms.filter(r => this.isRoomAvailable(r.id, day, lesson.periods));
         }
      } else {
         candidateRooms = this.rooms.filter(r => this.isRoomAvailable(r.id, day, lesson.periods));
      }

      for (const room of candidateRooms) {
          if (!this.isRoomAvailable(room.id, day, lesson.periods)) continue;

          const evaluation = this.scoreRoom(room, requiredCapacity, lesson, context);
          if (evaluation.valid) {
             let currentScore = evaluation.score;
             currentScore += Math.random() * 2; // variance to break ties
             
             if (currentScore > maxScore) {
                 maxScore = currentScore;
                 bestSlot = {
                     weekday: day,
                     roomId: room.id,
                     roomName: room.name,
                     score: Math.floor(currentScore),
                     reasons: evaluation.reasons,
                     warnings: [...warnings]
                 };
             }
          }
      }
    }

    return bestSlot;
  }

  scoreWeeklyDistribution(allocations, preference) {
    let score = 0;
    const reasons = [];
    const warnings = [];

    const unallocated = allocations.filter(a => !a.weekday).length;
    if (unallocated === 0) {
        score += 20;
        reasons.push("Todas as aulas foram alocadas com sucesso");
    } else {
        score -= (unallocated * 20);
        warnings.push(`${unallocated} aula(s) não puderam ser alocadas`);
    }

    const presencialAllocs = allocations.filter(a => a.classType === 'presencial' && a.weekday !== null);
    if (presencialAllocs.length > 1) {
        const days = presencialAllocs.map(a => a.weekday).sort((a,b)=>a-b);
        let maxGap = 0;
        for (let i=1; i<days.length; i++) {
            maxGap = Math.max(maxGap, days[i] - days[i-1]);
        }

        if (preference === "concentrada") {
            if (maxGap <= 1) {
                score += 15;
                reasons.push("Aulas presenciais agrupadas perfeitamente");
            } else {
                score -= 8;
                warnings.push("Aulas presenciais ficaram distantes ao longo da semana");
            }
        } else if (preference === "distribuida") {
            if (maxGap > 1) {
                score += 15;
                reasons.push("Aulas presenciais intercaladas na semana");
            } else {
                score -= 8;
                warnings.push("Aulas presenciais ficaram encavaladas em dias consecutivos");
            }
        }

        const uniqueRooms = new Set(presencialAllocs.map(a => a.suggestedRoomId));
        if (uniqueRooms.size === 1) {
            score += 10;
            reasons.push("Manteve a mesma sala para todas as aulas presenciais");
        } else if (uniqueRooms.size > 2) {
            score -= 15;
            warnings.push("Houve múltiplas trocas de sala");
        }
    }

    const hasSaturday = allocations.some(a => a.weekday === 6);
    if (!hasSaturday) {
        score += 8;
        reasons.push("Evitou o uso do sábado");
    } else {
        score -= 10;
        warnings.push("Precisou alocar aula no sábado");
    }

    return { score, reasons, warnings };
  }

  attemptAllocation(targetClasses, lessons, distributionPreference) {
    const allocations = [];
    const usedSlots = new Set();
    const context = {
        previousRoomIds: [],
        preferredRoomId: null
    };

    // Sort lessons to allocate presencial first
    const sortedLessons = [...lessons].sort((a, b) => {
        if (a.classType === 'presencial' && b.classType !== 'presencial') return -1;
        if (a.classType !== 'presencial' && b.classType === 'presencial') return 1;
        return (b.periods ? b.periods.length : 0) - (a.periods ? a.periods.length : 0);
    });

    for (const lesson of sortedLessons) {
        if (lesson.selectedRoomId && lesson.roomSelectionMode === "preferred") {
            context.preferredRoomId = lesson.selectedRoomId;
        }

        const result = this.findBestSlot(targetClasses, lesson, usedSlots, context);

        if (result) {
            allocations.push({
                lessonNumber: lesson.lessonNumber,
                classType: lesson.classType,
                periods: lesson.periods,
                selectedRoomId: lesson.selectedRoomId,
                roomSelectionMode: lesson.roomSelectionMode,
                weekday: result.weekday,
                suggestedRoomId: result.roomId,
                suggestedRoomName: result.roomName,
                score: result.score,
                reasons: result.reasons,
                warnings: result.warnings || [],
                conflicts: []
            });
            lesson.periods.forEach(p => usedSlots.add(`${result.weekday}-${p}`));
            if (result.roomId) context.previousRoomIds.push(result.roomId);
        } else {
            allocations.push({
                lessonNumber: lesson.lessonNumber,
                classType: lesson.classType,
                periods: lesson.periods,
                selectedRoomId: lesson.selectedRoomId,
                roomSelectionMode: lesson.roomSelectionMode,
                weekday: null,
                suggestedRoomId: null,
                suggestedRoomName: null,
                score: -50,
                reasons: [],
                warnings: [],
                conflicts: ["Não foi possível encontrar horário ou sala disponível sem gerar conflitos"]
            });
        }
    }

    const distribution = this.scoreWeeklyDistribution(allocations, distributionPreference);
    const totalScore = allocations.reduce((sum, a) => sum + (a.score || 0), 0) + distribution.score;

    let status = 'ideal';
    if (totalScore < 30) status = 'aceitavel';
    if (allocations.some(a => !a.weekday)) status = 'inviavel';

    const summaryParts = [];
    if (allocations.every(a => a.weekday)) {
        summaryParts.push("Viável.");
    } else {
        summaryParts.push("Inviável. Falta horários ou salas.");
    }
    if (distribution.reasons.length > 0) {
        summaryParts.push(distribution.reasons.join(". ") + ".");
    }

    return {
        id: 'sim_' + Math.random().toString(36).substr(2, 9),
        score: totalScore,
        status,
        summary: summaryParts.join(" "),
        allocations: allocations.sort((a,b) => (a.weekday || 9) - (b.weekday || 9)),
        reasons: distribution.reasons,
        warnings: distribution.warnings
    };
  }

  generateSuggestions(courseId, classIds, lessonsToAllocate, distributionPreference) {
    const suggestions = [];
    const targetClasses = classIds.map(id => this.classes.find(c => c.id === id)).filter(Boolean);
    
    if (targetClasses.length === 0) return [];

    const seenFingerprints = new Set();

    for (let i = 0; i < 30; i++) {
      const suggestion = this.attemptAllocation(targetClasses, lessonsToAllocate, distributionPreference);
      
      if (suggestion) {
        const fingerprint = suggestion.allocations.map(a => 
            `${a.lessonNumber}|${a.weekday}|${a.periods.join(',')}|${a.suggestedRoomId}`
        ).sort().join('||');

        if (!seenFingerprints.has(fingerprint)) {
            seenFingerprints.add(fingerprint);
            suggestions.push(suggestion);
        }
      }
    }

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 10);
  }
}
